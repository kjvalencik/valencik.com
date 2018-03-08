---
title: Radians and Rust Integer Overflow
date: "2018-03-08T23:28:50.981Z"
---

One of the core principles of Rust is borrowed from C++--zero-cost abstractions.

> In general, C++ implementations obey the zero-overhead principle: What you
> don't use, you don’t pay for. And further: What you do use, you couldn’t hand
> code any better.
>
> -- Bjarne Stroustrup

This permeates much of the ecosystem including [traits][traits],
[borrowing][borrowing], and [iterators][iterators]. One of the more interesting
trade-offs is the way integer overflow is handled. Fixed size integers in Rust
are implemented with [two's complement][twos-compliment] and may
[overflow][integer-overflow].

For example, assume with have a `u8`, an unsigned 8-bit integer. It can
represent values from `0` to `255`.

```rust
fn main() {
	let x = 254u8;
	println!("{} {:b}", x, x);

	let y = x + 1;
	println!("{} {:b}", y, y);

	let z = y + 1;
	println!("{} {:b}", z, z);
}
```

After performing the second addition, the correct result should be `256`, but
this exceeds the maximum value of a `u8`.

_Note: If you are following along, all examples use
[cargo-script][cargo-script]._

```
$ cargo script --debug main.rs
254 11111110
255 11111111
thread 'main' panicked at 'attempt to add with overflow', main.rs:8:10
```

Rust detects the overflow and panics, unwinding the stack and exiting the
process. Unfortunately, the process of checking arithmetic for overflow is very
expensive. Rust makes a trade-off for performance by _disabling_ overflow checks
in release mode.

```
$ cargo script main.rs
254 11111110
255 11111111
0 0
```

In this example, instead of a panic the result wrapped around by truncating the
highest bits. By making this trade-off, hopefully, overflow bugs are caught in
testing without impacting release performance. The specifics of integer overflow
in Rust are defined by [RFC 560][rfc-560].

## A unit of measure

Diverging from Rust for a moment, let's discuss some math. [Radians][radian] are
a unit for measuring angles. Radians are defined as the ratio of arc length to
the radius of a circle. As such, a full turn is equivalent to $2\pi\ rad$.

<!-- prettier-ignore -->
$$$
2\pi\ rad = 360\degree
$$$

Since angles are periodic by nature, the range of possible values is limited
such that for any angle $\alpha$

<!-- prettier-ignore -->
$$$
0 \leq \alpha\ \lt 2\pi
$$$

Let's define a new unit of measure for angles. We define the unit as a fraction
of a radian.

<!-- prettier-ignore -->
$$$
\begin{aligned}
2\pi\ rad = 65536\ unit\\
0\ unit = 65536\ unit
\end{aligned}
$$$

Great! We've defined a new unit and we can convert to and from an [SI
unit][si-unit]. Now what?

## Eureka

A keen eye will have noticed the power of 2. If we map our angles to discrete
units, the maximum value is the same as an unsigned 16-bit integer (`u16`).

<!-- prettier-ignore -->
$$$
2^{16} = 65536
$$$

<!-- prettier-ignore -->
$$$
\{{\alpha \in \mathbb Z: 0 \le \alpha \lt 65536}\}
$$$

This is a very neat property. We have mapped the periodic nature of angles to
the overflow mechanics of two's compliment arithmetic. This allows for some
optimizations. For example, comparing two angles for equality.

Two angles $\alpha$ and $\beta$ are equal, $\alpha = \beta$, if and only if
there exists some $x \in \mathbb Z$ such that $x \cdot \alpha = \beta$ or
$\alpha = x \cdot \beta$.

Typically this requires division and comparing against some $\epsilon$ error
margin in the case of floats. Instead, we can simply compare their values.

```rust
fn main() {
	let x = 0u16;
	let y = x + 65535 + 1;

	println!("{}", x == y);
}
```

```
$ cargo script --debug main.rs
thread 'main' panicked at 'attempt to add with overflow', main.rs:3:10
```

Uh, oh. That's not what we wanted.

## Controlling the flow

Rust is preventing us from performing exactly the operation we want--addition
with overflow. For precisely this purpose, Rust provides `wrapping_` methods.
The [`wrapping_add`][wrapping-add] method on `u16` will sum the two numbers with
wrapping on overflow.

```rust
fn main() {
	let x = 0u16;
	let y = x.wrapping_add(65535).wrapping_add(1);

	println!("{}", x == y);
}
```

```
$ cargo script --debug main.rs
true
```

Great! Our code is working again, but we've lost the ergonomics of code that
looks similar to the mathematical operations we want to perform. Rust provides
operator overloading via the [`std::ops`][ops-traits] traits. We can follow the
[newtype][newtype] idiom and implement the [`std::ops::Add`][add-trait] trait on
that.

```rust
use std::ops::Add;

#[derive(Clone, Copy, PartialEq)]
struct Angle(u16);

impl Add for Angle {
	type Output = Angle;

	fn add(self, rhs: Self::Output) -> Self::Output {
		Angle(self.0.wrapping_add(rhs.0))
	}
}

fn main() {
	let x = Angle(0u16);
	let y = x + Angle(65535) + Angle(1);

	println!("{}", x == y);
}
```

In addition to providing a struct to impl, the newtype pattern is useful for
ensuring correctness. For example, the compiler prevents us from accidentally
adding our `Angle` type to a simple `u16` which may represent a [different
scale][mars-orbiter].

```rust
fn main() {
	let x = Angle(0u16);
	let y = 65535u16; // Represents 180 deg instead of 360 deg
	let z = x + y + Angle(1);

	println!("{}", x == z);
}
```

```
error[E0308]: mismatched types
  --> main.rs:17:14
   |
17 |     let z = x + y + Angle(1);
   |                 ^
   |                 |
   |                 expected struct `Angle`, found u16
   |                 help: try using a variant of the expected type: `Angle(y)`
   |
   = note: expected type `Angle`
              found type `u16`
```

## Wrapping

We likely need to support other arithmetic operations besides addition. It can
get tedious to implement each of these traits on `Angle`. Fortunately, this was
considered as part of the RFC. [`std::num::Wrapping<T>`][wrapping] is a generic
struct with specialized implementation of many arithmetic traits.

We can replace our `Angle` struct with `Wrapping` and get operator overloading
with wrapping on overflow for free!

```rust
use std::num::Wrapping;

fn main() {
	let x = Wrapping(0u16)
	let y = Wrapping(65535u16);
	let z = x - Wrapping(1);

	println!("{}", y == z);
}
```

```
$ cargo script --debug main.rs
true
```

## Going Further

When switching from the `Angle` newtype to the built-in `Wrapping` struct we
traded the type checking validation of our angle units to eliminate the
boilerplate of lots of traits impls. This isn't an ideal trade-off.

It would be great if Rust included something analogous to Haskell's
[`GeneralisedNewtypeDeriving`][haskell-newtype-derive]. This extension allows
deriving any traits implemented by the enclosed type. At the time of this
writing, Rust does not have anything this powerful. But, the macro system can
come close for this use case.

The [derive_more][derive-more] crate provides [procedural
macros][procedural-macros] for deriving common traits by inferring an
implementation from the shape of the data. This works fairly well for simple
types.

````rust
//! ```cargo
//! [dependencies]
//! derive_more = "0.7"
//! ```

#[macro_use]
extern crate derive_more;

use std::num::Wrapping;

// Use the `derive_more` crate to derive `Add` and `Sub`!
#[derive(PartialEq, Clone, Copy, Add, Sub)]
struct Angle(Wrapping<u16>);

// Implement `From` for our newtype to create an `Angle` directly from a `u16`
impl From<u16> for Angle {
	fn from(n: u16) -> Self {
		Angle(Wrapping(n))
	}
}

fn main() {
	let x = Angle::from(0);
	let y = Angle::from(65535);

	// The `From` trait provides `into`. The type can be inferred.
	let z = x + x - 1.into();

	println!("{}", y == z);
}
````

```
$ cargo script --debug main.rs
true
```

We wrap the `Wrapping` struct in our newtype and use `derive_more` to derive an
`impl` for `Sub` on `Angle`. We manually implement `From` to make it easier to
get a new `Angle` directly from a `u16`.

I enjoyed delving into the various abstractions that rust provides and the
decisions and trade-offs that language makes. I hope you learned something
interesting as well!

[traits]: https://doc.rust-lang.org/book/first-edition/traits.html
[borrowing]: https://doc.rust-lang.org/book/first-edition/references-and-borrowing.html
[iterators]: https://doc.rust-lang.org/book/first-edition/iterators.html
[integer-overflow]: https://en.wikipedia.org/wiki/Integer_overflow
[twos-compliment]: https://en.wikipedia.org/wiki/Two%27s_complement
[rfc-560]: https://github.com/rust-lang/rfcs/blob/master/text/0560-integer-overflow.md
[cargo-script]: https://github.com/DanielKeep/cargo-script
[radian]: https://en.wikipedia.org/wiki/Radian
[si-unit]: https://en.wikipedia.org/wiki/International_System_of_Units
[wrapping-add]: https://doc.rust-lang.org/std/primitive.u16.html#method.wrapping_add
[ops-traits]: https://doc.rust-lang.org/std/ops/
[newtype]: https://wiki.haskell.org/Newtype
[add-trait]: https://doc.rust-lang.org/std/ops/trait.Add.html
[wrapping]: https://doc.rust-lang.org/stable/std/num/struct.Wrapping.html
[haskell-newtype-derive]: https://downloads.haskell.org/~ghc/latest/docs/html/users_guide/glasgow_exts.html#generalised-derived-instances-for-newtypes
[derive-more]: https://crates.io/crates/derive_more
[procedural-macros]: https://doc.rust-lang.org/book/first-edition/procedural-macros.html
[mars-orbiter]: https://en.wikipedia.org/wiki/Mars_Climate_Orbiter
