---
title: Extending Promise
date: 2018-02-16T21:16:13.026Z
---

[`Promise`][promise-ref] was added to javascript in the [ECMAScript
2015][es2015] (ES6) standard. If you haven't had a chance to use promises, I
recommend the MDN guide on [using promises][promise-guide]. One of the neat
things about promises is that they are [designed][promise-subclass] to be
extensible. When calling methods that construct new promises, they use
`this.constructor`.

We can verify this by checking the class of the new promise.

```js
class MyPromise extends Promise {}

const p0 = MyPromise.resolve();
const p1 = p.then(() => {});

assert(p0 instanceof MyPromise);
assert(p1 instanceof MyPromise);
```

We've created our own sub-class of `Promise` that we can call
[combinators][combinators] (e.g., `then`) on and it returns an instance of that
sub-class!

## Our first combinator

This is where it gets fun. What if we want to extend the set of built-in
combinators to build a promise utility belt like [Bluebird][bluebird]? Let's
start with something simple. We want to add a simple method (`log`) that logs
the value and passes the result unmodified.

```js
class PromiseCombinator extends Promise {
	log(log = console.log) {
		return this.then(value => {
			log(value);

			return value;
		});
	}
}
```

Wait, `this.then`? What's this about? Since `log` is a method on
[`PromiseCombinator.prototype`][prototypal-inheritance] it can reference the
promise as `this` to start chaining. Let's break this code down.

We define a sub-class of `Promise` called `PromiseCombinator`.

```js
class PromiseCombinator extends Promise {
```

We define a method on that class named `log`. It accepts a single argument named
`log` with a [default value][destructuring] of `console.log`.

```js
	log(log = console.log) {
```

Next, we want the value the promise resolves to and not just the promise. We use
`.then` to chain a callback and add our log. We also `return` the original value
to ensure that it doesn't get dropped.

```js
return this.then(value => {
	log(value);

	return value;
});
```

Finally, let's see how it can be used.

```js
PromiseCombinator.resolve("Hello, World!")
	.log()
	.then(value => assert.equal(value, "Hello, World!"));
```

```
Hello, World!
```

## Something useful

Creating a `log` method was a good learning exercise, but isn't especially
useful. A common task is to perform an action on a collection of values, e.g.
`map` and `filter`. [`Array.prototype`][array-prototype] provides a good
template for implementation.

### Map

[Array.prototype.map][array-map] accepts a method that will be called for each
item in the collection and produces a new `Array` with the results. The method
receives 3 arguments: the item, the position in the array, and the full array.

Let's create a version of `map` that executes an asynchronous task for each item
concurrently. This is where [`Promise.all`][promise-all] comes in handy.
`Promise.all` accepts a collection of promises. It returns a promise that
resolves to a collection of values from each of those promises.

```js
class PromiseCombinator extends Promise {
	map(callback) {
		return this.then(arr => {
			const promises = arr.map(callback);

			return Promise.all(promises);
		});
	}
}
```

Shouldn't we use `PromiseCombinator.all`? Won't this cause us to return an
instance of `Promise` instead of `PromiseCombinator`? It turns out, it doesn't
matter because the `then` ensures we always return an instance of
`this.constructor`.

The call to the built-in `arr.map` creates an array of promises and the call to
`Promise.all` waits for those promises to resolve.

```js
const promises = arr.map(callback);

return Promise.all(promises);
```

### Filter

[Array.prototype.filter][array-filter] accepts a method called a
[predicate][predicate]. A predicate is a function that either evaluates to
`true` or `false`. Similar to map, the predicate is called for each item in the
collection and receives the item, the index and the array. The result of
`filter` is a new array that only contains the items where the `predicate`
evaluated to a [truthy][truthy] value.

Once we've implemented an asynchronous `map`, an asynchronous `filter` follows
naturally. We can use `map` to handle a predicate that returns a promise.

```js
class PromiseCombinator extends Promise {
	map(callback) {
		return this.then(arr => {
			const promises = arr.map(callback);

			return Promise.all(promises);
		});
	}

	filter(predicate) {
		return this.then(arr => {
			return this.map(predicate).then(values =>
				arr.filter((_, i) => values[i])
			);
		});
	}
}
```

First, let's wait for the promise to resolve and then let's use `map` to execute
our predicate on each of the values. The order of these calls does not matter
and they can be inverted, but later we will need a copy of the original array.

```js
return this.then(arr => {
	return this.map(predicate).then(values =>

// also acceptable
return this.map(predicate).then(values => {
	return this.then(arr =>
```

Lastly, we can perform a synchronous `filter` on the original array using the
results from the `map`.

```js
arr.filter((_, i) => values[i]);
```

Putting it all together, we can produce a promise chain that filters to even
numbers and multiplies them by `2`.

```js
PromiseCombinator.resolve([1, 2, 3, 4])
	// Return a promise from the predicate for demonstration purposes
	.filter(x => Promise.resolve(x % 2))
	.map(x => x * 2)
	.then(values => assert.deepEqual(values, [2, 6]));
```

## Going further

Now we can chain multiple methods together, but the nested calls in `filter` are
difficult to follow. Can we do better? [Async/Await][async] is a feature added
in [ECMAScript 2017][es2017] (ES8). It utilizes the [`await`][await] operator to
write asynchronous code more like synchronous code. We can re-write our `filter`
method `async`.

```js
class PromiseCombinator extends Promise {
	map(callback) {
		return this.then(arr => {
			const promises = arr.map(callback);

			return Promise.all(promises);
		});
	}

	filter(predicate) {
		return this.then(async arr => {
			const values = await this.map(predicate);

			return arr.filter((_, i) => values[i]);
		});
	}
}

PromiseCombinator.resolve([1, 2, 3, 4])
	.filter(x => x % 2)
	.map(x => x * 2)
	.then(values => assert.deepEqual(values, [2, 6]));
```

The `async` operator will ensure that the method _always_ returns a promise and
enables the use of the `await` operator.

```js
		return this.then(async arr => {
```

The `await` operator will defer execution of the block until a value is yielded
from the promise.

```js
			const values = await this.map(predicate);
```

Great! But, if we can define a method as `async`, why use `.then` at all in our
methods? Can't we define `map` and `filter` `async` as well?

```js
class PromiseCombinator extends Promise {
	async map(callback) {
		const arr = await this;
		const promises = arr.map(callback);

		return Promise.all(promises);
	}

	async filter(predicate) {
		const arr = await this;
		const values = await this.map(predicate);

		return arr.filter((_, i) => values[i]);
	}
}

PromiseCombinator.resolve([1, 2, 3, 4])
	.filter(x => x % 2)
	.map(x => x * 2)
	.then(values => assert.deepEqual(values, [2, 6]));
```

```
TypeError: PromiseCombinator.resolve(...).filter(...).map is not a function
```

We _can_, but it turns out it breaks chaining. Any method defined as `async`
will always return a `Promise` even if a sub-class is returned inside.

## Series

So far, we've only worked with unbounded parallelism. What if we wanted to
implement a `forEach` method that operated serially? I.e., we call a method for
each item in a collection, waiting for the result to resolve before continuing
to the next item.

The `await` will defer execution of the remainder of the block until the promise
has resolved. If it is called in a loop, the loop will pause on each iteration
to await the promise. We can combine this with
[`Array.prototype.entries`][array-entries]--a method of enumerating the indices
and values of an `Array`--and have a fairly succinct way of expressing a serial
`forEach`.

```js
class PromiseCombinator extends Promise {
	forEach(callback) {
		return this.then(async arr => {
			for (const [index, value] of arr.entries()) {
				await Promise.resolve(callback(value, index, arr));
			}
		});
	}
}
```

The only trick here is that `callback` may or may not return a promise. Unlike
`Promise.all`, the `await` operator _requires_ a promise. We can use
[`Promise.resolve`][promise-resolve] to wrap the result in a promise if it isn't
a promise already.

## Putting it all together

One last improvement we can make to ergonomics is to add some [static][static]
methods to remove redundant calls to `PromiseCombinator.resolve`.

```js
class PromiseCombinator extends Promise {
	static map(value, callback) {
		return PromiseCombinator.resolve(value).map(callback);
	}

	static filter(value, predicate) {
		return PromiseCombinator.resolve(value).filter(predicate);
	}

	static forEach(value, callback) {
		return PromiseCombinator.resolve(value).forEach(callback);
	}

	map(callback) {
		return this.then(arr => {
			const promises = arr.map(callback);

			return Promise.all(promises);
		});
	}

	filter(predicate) {
		return this.then(async arr => {
			const values = await this.map(predicate);

			return arr.filter((_, i) => values[i]);
		});
	}

	forEach(callback) {
		return this.then(async arr => {
			for (const [index, value] of arr.entries()) {
				await Promise.resolve(callback(value, index, arr));
			}
		});
	}
}

PromiseCombinator.filter([1, 2, 3, 4], x => x % 2)
	.map(x => x * 2)
	.then(values => assert.deepEqual(values, [2, 6]));
```

## Shameless plug

It was fun learning about promises and how they can be extended with more
powerful combinators. For a more complete collection of combinators, you may be
interested in my library [extends-promise][extends-promise].

[es2015]: http://www.ecma-international.org/ecma-262/6.0/
[es2017]: http://www.ecma-international.org/ecma-262/8.0/
[promise-ref]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[promise-guide]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
[promise-subclass]: https://www.ecma-international.org/ecma-262/6.0/#sec-newpromisecapability
[combinators]: https://wiki.haskell.org/Combinator
[predicate]: https://en.wikipedia.org/wiki/Predicate_(mathematical_logic)
[truthy]: https://developer.mozilla.org/en-US/docs/Glossary/Truthy
[bluebird]: http://bluebirdjs.com
[prototypal-inheritance]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain
[async]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
[await]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await
[destructuring]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
[array-prototype]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/prototype
[array-map]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
[array-filter]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
[array-entries]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries
[promise-all]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
[promise-resolve]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve
[extends-promise]: https://github.com/kjvalencik/extends-promise
[static]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/static
