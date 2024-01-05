# Evidence - Data Source Plugin Examples

This repository demonstrates how to create a new data source as a plugin to Evidence. Additional instructions can be found in the [docs](https://docs.evidence.dev/plugins/creating-a-plugin/)

## Examples In this Repository

- [Google Sheets](https://github.com/evidence-dev/datasources/tree/main/gsheets)
- [Influx DB](https://github.com/evidence-dev/datasources/tree/main/influxdb)

## Creating your own plugin

A plugin only _requires_ three files - others are optional, though can help with testing, documenting, and version control etc.

```
your-plugin-repo/
|-- README.md
|-- package.json
`-- index.mjs
```

- `README.md` - any required documentation for users
- `package.json` - import any required dependencies, specify how the plugin is named in Evidence, and publish options
- `index.mjs` - define how the data is fetched from your data source, and passed to Evidence. You normally need to:
   - **Define Options**: Expose fields to allow users to configure their source: usernames, passwords, secrets, API keys etc
   - **Create a Runner**: Extract data from a source either by running a query (SQL) or some other opearation (non-SQL)
   - **Create a Test Function**: A simple query or operation to allow users to verify if connection is configured correctly
   - **Transform Data**: Get extracted data into the table structure Evidence requires
   - **Define Types**: Map each different data type to one of the four Evidence Types: NUMBER, DATE, STRING, BOOL
 
## Publishing your plugin

Plugins should be published to a registry to be accessible to Evidence projects.

The most popular registry for Node.js packages is npm.

1. Create an [npm account](https://www.npmjs.com/signup)
2. Login to your npm account
```bash
npm login
```
3. Once you have configured your `package.json`, you can publish your package
```
npm publish
```
   
## Where to start

We recommend copying the `package.json` and `index.mjs` from one of the following as a starting point.

- The [Postgres](https://github.com/evidence-dev/evidence/tree/main/packages/postgres) source is a good example for a SQL source
- The [GSheets](https://github.com/evidence-dev/datasources/tree/main/gsheets) plugin is a good example for a Non-SQL source
