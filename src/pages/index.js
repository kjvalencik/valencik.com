import React from "react";
import Link from "gatsby-link";
import Helmet from "react-helmet";

import Bio from "../components/Bio";
import { rhythm } from "../utils/typography";

// FIXME: Remove this
function get(base, path) {
	return path
		.split(".")
		.reduce((o, k) => (o === undefined || o === null ? o : o[k]), base);
}

class BlogIndex extends React.Component {
	render() {
		const siteTitle = get(this, "props.data.site.siteMetadata.title");
		const posts = get(this, "props.data.allMarkdownRemark.edges");

		return (
			<div>
				<Helmet title={siteTitle} />
				<Bio />
				{posts.map(({ node }) => {
					const title =
						get(node, "frontmatter.title") || node.fields.slug;
					return (
						<div key={node.fields.slug}>
							<h2
								style={{
									marginBottom: rhythm(1 / 4)
								}}
							>
								<Link
									style={{
										boxShadow: "none",
										textDecoration: "none"
									}}
									to={node.fields.slug}
								>
									{title}
								</Link>
							</h2>
							<small>{node.frontmatter.date}</small>
							<p
								dangerouslySetInnerHTML={{
									__html: node.excerpt
								}}
							/>
						</div>
					);
				})}
			</div>
		);
	}
}

export default BlogIndex;

export const pageQuery = graphql`
	query IndexQuery {
		site {
			siteMetadata {
				title
			}
		}
		allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
			edges {
				node {
					excerpt
					fields {
						slug
					}
					frontmatter {
						date(formatString: "DD MMMM, YYYY")
						title
					}
				}
			}
		}
	}
`;
