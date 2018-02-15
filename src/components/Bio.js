import React from "react";

import { rhythm } from "../utils/typography";

const gravatar =
	"https://www.gravatar.com/avatar/701622cab2d0dc4bfe70e496b61b0763";

class Bio extends React.Component {
	render() {
		return (
			<div
				style={{
					display: "flex",
					marginBottom: rhythm(1.5)
				}}
			>
				<img
					src={gravatar}
					alt={"K.J. Valencik"}
					style={{
						marginRight: rhythm(1 / 2),
						marginBottom: 0,
						borderRadius: "50%",
						width: rhythm(2),
						height: rhythm(2)
					}}
				/>
				<p>
					Hi! I'm K.J. and I like to make things. I'm interested in
					Rust, JS, Kubernetes, distributed systems and neat
					technology. Check me out on{" "}
					<a href="https://github.com/kjvalencik">Github</a>.
				</p>
			</div>
		);
	}
}

export default Bio;
