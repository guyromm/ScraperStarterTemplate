// This file is not going through babel transformation.
// So, we write it in vanilla JS
// (But you could use ES2015 features supported by your Node.js version)
const webpack = require('webpack')
const l = console.log;
//const Dotenv = require('dotenv-webpack');
const EnvironmentPlugin = webpack.EnvironmentPlugin;
const d = require('dotenv');
const ReplaceInFileWebpackPlugin = require('replace-in-file-webpack-plugin');
d.config()
//l(d);throw new Error('bye')
l('DOTENV IMPORT',process.env)
//throw new Error('kbye')
module.exports = {
  webpack: (config, { dev, vendor }) => {
    // Perform customizations to webpack config
      //l('PLUGINS',config.plugins); //   plugins: [    new Dotenv()  ]
      l('PUSHED DOTENV');
      //config.plugins.push(new Dotenv({ignoreStub:true,path:'.'}));
      config.plugins.push(new EnvironmentPlugin({...process.env}))
      if (process.env.EXTENSION_PORT)
      {
	  for (let [k,v] of Object.entries(config.plugins))
	  {
	      if (v.constructor.name==='WebextensionPlugin')
	      {
		  v.port = process.env.EXTENSION_PORT
		  l('EXTENSION_PORT=',v.port)
		  
	      }
	  }
      }
      //l('config=',Object.entries(config.plugins).map(e=>e[1].constructor.name)) // .WebextensionPlugin.port)
      //l('config.plugins=',config.plugins)
      // Important: return the modified config


      for (const v of ['APPNAME','TARGET_DOMAIN'])
      {
	  config.plugins.push(new ReplaceInFileWebpackPlugin([
	      {
		  dir: `dist/${vendor}`,
		  files: ['manifest.json'],
		  rules: [{
		      search: new RegExp('process.env.'+v,'gi'),
		      replace: process.env[v],
		  }]
	      }
	  ]))
      }
    return config
  }
}
