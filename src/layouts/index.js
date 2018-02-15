import React from "react";
import Link from "gatsby-link";
import { Container } from "react-responsive-grid";

import { rhythm, scale } from "../utils/typography";

class Template extends React.Component {
	render() {
		const { location, children } = this.props;
		const title = this.props.data.site.siteMetadata.title;

		const rootPath = "/";
		const header =
			location.pathname === rootPath ? (
				<h1
					style={{
						...scale(1.5),
						marginBottom: rhythm(1.5),
						marginTop: 0
					}}
				>
					<Link
						style={{
							boxShadow: "none",
							textDecoration: "none",
							color: "inherit"
						}}
						to={"/"}
					>
						{title}
					</Link>
				</h1>
			) : (
				<h3
					style={{
						marginTop: 0
					}}
				>
					<Link
						style={{
							boxShadow: "none",
							textDecoration: "none",
							color: "inherit"
						}}
						to={"/"}
					>
						{title}
					</Link>
				</h3>
			);

		return (
			<Container
				style={{
					maxWidth: rhythm(30),
					padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`
				}}
			>
				{header}
				{children()}
			</Container>
		);
	}
}

export const pageQuery = graphql`
	query BaseQuery {
		site {
			siteMetadata {
				title
			}
		}
	}
`;

export default Template;
