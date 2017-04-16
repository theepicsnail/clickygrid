module.exports = {
	entry: './src/main.ts',
	output: {
		filename: 'bundle.js',
		path: __dirname
	},
	module: {
		rules: [
		{
      test: /\.tsx?$/,
      loader: 'ts-loader',
      exclude: /node_modules/,
		},
		]
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"]
	},
};
