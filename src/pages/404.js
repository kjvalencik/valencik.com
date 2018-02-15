import React from "react";
import Link from "gatsby-link";
import Helmet from "react-helmet";

import { rhythm } from "../utils/typography";

class NotFound extends React.Component {
	render() {
		const { title } = this.props.data.site.siteMetadata;

		return (
			<div>
				<Helmet title={title} />
				<h1>Page Not Found</h1>
			</div>
		);
	}
}

export default NotFound;

export const pageQuery = graphql`
	query NotFoundQuery {
		site {
			siteMetadata {
				title
			}
		}
	}
`;
