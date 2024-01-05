# Evidence - Data Source Plugin Examples

This repository demonstrates how to create a new data source as a plugin to Evidence. Additional instructions can be found in the [docs](https://docs.evidence.dev/plugins/creating-a-plugin/)

## Examples In this Repository

- [Google Sheets]
- [Influx DB](https://github.com/evidence-dev/datasources/tree/main/influxdb)

## Creating your own plugin

A plugin only requires two files - all others are optional, though can be helpful for testing and documenting etc.
- `package.json` - where you import any required dependencies, as well as how the plugin name in Evidence
- `index.mjs` - this is where you define how the data is fetched from your data source, and passed to Evidence. You normally need:
   - **Define Options**: Expose fields to allow users to configure their source: usernames, passwords, secrets, API keys etc
   - **Create a Runner**: Extract data from a source either by running a query (SQL) or some other opearation (non-SQL)
   - **Create a Test Function**: A simple query or operation to allow users to verify if connection is configured correctly
   - **Transform Data**: Get extracted data into the table structure Evidence requires
   - **Define Types**: Map each different data type to one of the four Evidence Types: NUMBER, DATE, STRING, BOOL
   
 
The [Postgres](https://github.com/evidence-dev/evidence/tree/main/packages/postgres) source is a good example for a SQL source
The [GSheets](https://github.com/evidence-dev/datasources/tree/main/gsheets) plugin is a good example for a Non-SQL source
