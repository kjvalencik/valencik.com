import Typography from "typography";
import USWebDesignStandards from "typography-theme-us-web-design-standards";

// Import typefaces
import "typeface-ubuntu";
import "typeface-ubuntu-condensed";

// syntax highlighting
import "prismjs/themes/prism.css";
import "katex/dist/katex.css";

const prismBackground = "#f5f2f0";

const typography = new Typography({
	...USWebDesignStandards,
	googleFonts: [],
	headerFontFamily: ["Ubuntu Condensed", "sans-serif"],
	headerWeight: 400,
	bodyFontFamily: ["Ubuntu", "sans-serif"],
	overrideThemeStyles: ({ rhythm }) => ({
		code: {
			lineHeight: 1
		},
		"p > code": {
			backgroundColor: prismBackground,
			padding: rhythm(1 / 8)
		},
		".gatsby-highlight": {
			marginBottom: `${USWebDesignStandards.baseLineHeight}rem`
		},
		"a.gatsby-resp-image-link": {
			boxShadow: "none"
		}
	})
});

// Hot reload typography in development.
if (process.env.NODE_ENV !== "production") {
	typography.injectStyles();
}

export default typography;
