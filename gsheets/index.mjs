import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import yaml from "yaml";

/**
 * @typedef {Object} GoogleSheetsOptions
 * @property {string} client_email
 * @property {string} private_key
 */

/** @type {import("@evidence-dev/db-commons").ProcessSource<GoogleSheetsOptions>} */
export async function* processSource(opts, files, utils) {
  const auth = new JWT({
    email: opts.client_email,
    key: opts.private_key,
    scopes: SCOPES,
  });

  if (!("connection.yaml" in files))
    throw new Error("connection.yaml is missing; this is odd");
  const connYaml = await files["connection.yaml"]();

  const conn = yaml.parse(connYaml);
  if (!("sheets" in conn)) {
    console.log("No sheets found in connection.yaml");
    return null;
  }

  const { sheets } = conn;
  if (Array.isArray(sheets)) {
    console.log("Sheets should not be an array");
    return null;
  }
  if (typeof sheets !== "object") {
    console.log("Sheets should be an object");
    return null;
  }


  for (const [name, id] of Object.entries(sheets)) {
    const sheet = new GoogleSpreadsheet(id, auth)
    await sheet.loadInfo()
    
    // TODO: Page indexes?
    const page = sheet.sheetsByIndex[0]
    const pageStream = await page.downloadAsTSV(true)
    await page._ensureHeaderRowLoaded()
    /** @type {import("@evidence-dev/db-commons").ColumnDefinition[]} */
    const cols = page.headerValues.map(v => ({
        evidenceType: "string",
        typeFidelity: "inferred",
        name: v
    }))

    const sheetData = []
    await new Promise((res, rej) => {
        pageStream.on('data', (/** @type {Buffer} */ d) => {
            const batch = d.toString('utf-8').split("\r\n").map(line => line.split("\t"))
            sheetData.push(batch)
        })
        pageStream.on('end', res)
        pageStream.on('error', rej)
        pageStream.read()
    })

    yield {
        rows: sheetData,
        columnTypes: cols,
        name: name + "_" + page.title.replaceAll(" ","_").toLowerCase(),
        content: name + "_" + page.index 
    }
  }
  return null
}

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

export const options = {
  keyfile: {
    title: "Credentials File",
    type: "file",
    fileFormat: "json",
    virtual: true,
  },
  client_email: {
    title: "Client Email",
    type: "string",
    secret: true,
    required: true,
    references: "$.keyfile.client_email",
    forceReference: true,
  },
  private_key: {
    title: "Private Key",
    type: "string",
    secret: true,
    required: true,
    references: "$.keyfile.private_key",
    forceReference: true,
  },
};

export default { options };

/**@type {import("@evidence-dev/db-commons").ConnectionTester<GoogleSheetsOptions>} */
export const testConnection = async (opts) => {
  const auth = new JWT({
    email: opts.client_email,
    key: opts.private_key,
    scopes: SCOPES,
  });
  try {
    await auth.authorize();
    return true;
  } catch (e) {
    return {
      reason: e.message ?? "Failed to authenticate",
    };
  }
};

export const getRunner = () => {
  throw new Error(
    "Google Sheets connector does not support getRunner. Do you need to update your Evidence version?"
  );
};
