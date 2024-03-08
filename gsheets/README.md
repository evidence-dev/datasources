<img src="https://www.google.com/images/about/sheets-icon.svg" height="40"  style="margin-right: 50;"/><span>&nbsp;&nbsp;</span><img src="https://raw.githubusercontent.com/evidence-dev/media-kit/main/svg/logo-round-white-on-black.svg" height="40"/>

# Evidence Google Sheets Adapter

This plugin allows you to use Google Sheets as a datasource for [Evidence](https://evidence.dev).

## Generate Service Account Credentials

1. Create a [service account](https://console.cloud.google.com/iam-admin/serviceaccounts)
  - No permissions are needed
  - Create and download a json keyfile (you will need this file)
    ![Create a Key](image-1.png)
    ![Creata a Key](image-2.png)
    ![Create a Key](image-3.png)
2. Enable the [google sheets api](https://console.cloud.google.com/marketplace/product/google/sheets.googleapis.com?) in your project
3. Give the service account access to your sheet
   - Go to your sheet, and click the Share button
   - Enter the service account's email address and click Send


## Adding the Adapter to Evidence

1. Install the plugin
```
npm install @evidence-dev/connector-gsheets
```
2. Specify the plugin is a datasource, by adding it to `evidence.plugins.yaml` under `datasources:`
```
"@evidence-dev/connector-gsheets": { }
```

## Configuring your Connection

1. Add and save a new `gsheets` connection via the settings UI, selecting your service account json keyfile when prompted.
2. Edit the `connection.yaml` file to add any workbooks by using the sheet id (the alphanumeric string in the URL, after `https://docs.google.com/spreadsheets/d/`)


```
name: google_sheet
type: gsheets
options: {}
sheets:
  id: 1Sc4nyLSSNETSIEpNKzheh5AFJJ-YA-wQeubFgeeEw9g
```

## Source Config Options

Configure which sheets are imported in `connection.yaml`

### Named Source

Each source can be named, which allows more granular configuration options

- `id`: the id of the sheet in the URL
- `pages`: a YAML list of all the tabs you want to fetch (useful if you only want a subset of tabs or are getting 429 errors)

```
sheets:
  source_one: 
    id: 1Sc4nyLSSNETSIEpNKzheh5AFJJ-YA-wQeubFgeeEw9g
```


### Multiple Source Workbooks

```
sheets:
  source_one: 
    id: 1Sc4nyLSSNETSIEpNKzheh5AFJJ-YA-wQeubFgeeEw9g
  source_two: 
    id: kj235Bo3wRFG9kj3tp98grnPB-P97iu87lv877gliuId
```

### Only Import Specific Tabs

```
sheets:
  source_one: 
    id: 1Sc4nyLSSNETSIEpNKzheh5AFJJ-YA-wQeubFgeeEw9g
    pages: 
      - item_lookup
  source_two: 
    id: kj235Bo3wRFG9kj3tp98grnPB-P97iu87lv877gliuId
    pages: 
      - sales
```
