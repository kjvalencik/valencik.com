const path = require("path");
const { createFilePath } = require("gatsby-source-filesystem");

exports.createPages = ({ graphql, boundActionCreators }) => {
	const { createPage } = boundActionCreators;
	const blogPost = path.resolve("./src/templates/blog-post.js");

	return graphql(`
		{
			allMarkdownRemark(
				sort: { fields: [frontmatter___date], order: DESC }
				limit: 1000
			) {
				edges {
					node {
						fields {
							slug
						}
						frontmatter {
							title
						}
					}
				}
			}
		}
	`).then(result => {
		if (result.errors) {
			throw result.errors;
		}

		// Create blog posts pages.
		result.data.allMarkdownRemark.edges.forEach((post, i, posts) => {
			const { node: previous } = posts[i + 1] || {};
			const { node: next } = posts[i - 1] || {};

			createPage({
				path: post.node.fields.slug,
				component: blogPost,
				context: {
					slug: post.node.fields.slug,
					previous,
					next
				}
			});
		});
	});
};

exports.onCreateNode = ({ node, boundActionCreators, getNode }) => {
	if (node.internal.type !== "MarkdownRemark") {
		return;
	}

	const { createNodeField } = boundActionCreators;
	const value = createFilePath({ node, getNode });

	createNodeField({
		name: `slug`,
		node,
		value
	});
};
