import {GoogleSpreadsheet} from "google-spreadsheet";
import {JWT} from "google-auth-library";
import yaml from "yaml";

/**
 * @typedef {Object} GoogleSheetsOptions
 * @property {string} client_email
 * @property {string} private_key
 */


/**
 * This function is designed to convert numbers into column names, similar to Excel's column naming system.
 * It takes an integer as an input and returns a column name as a string. For instance, 1 is converted to 'A', 27 to 'AA'
 * It was AI-generated.
 * @param {number} num
 * @returns string
 */
function numberToColumnName(num) {
    let columnName = ''; // Initialize an empty string to store the column name

    while (num > 0) { // While the number is greater than 0
        let modulo = (num - 1) % 26; // Find the remainder when the number (minus 1) is divided by 26.
        // The reason to subtract 1 before the modulo operation is to shift the number range from 1-26 to 0-25.

        columnName = String.fromCharCode(65 + modulo) + columnName; // Convert the result (plus 65 to get the ASCII value) into a character and prepend it to the column name.

        num = Math.floor((num - modulo) / 26); // Update the number by subtracting the modulo and divide by 26. Math.floor is used to remove any decimal points.
    }

    return columnName; // Return the created column name.
}

/**
 * @param {unknown} v
 * @return {@import("@evidence-dev/db-commons")}
 */
function inferType(v) {

    if (!["number", "boolean", "string"].includes(typeof v) && !(v instanceof Date)) return "string";

    if (typeof v === "number") return "number";
    if (typeof v === "boolean" || ['true', 'false'].includes(v.toLowerCase())) return "boolean";
    if (!Number.isNaN(Date.parse(v))) {
        return "date";
    }
    return "string";
}

/**
 * @param {string | number | boolean | Date} v
 */
function cleanValue(v) {
    switch (typeof v) {
        case 'string':
            if (v.length === 0) return null
            break;
        case 'number':
            if (Number.isNaN(v)) return null
            break;
        case 'undefined': return null
        
    }
    return v;
}

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

    const {sheets} = conn;
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

        const colCount = page.columnCount
        const rowCount = page.rowCount

        await page._ensureHeaderRowLoaded()

        const lastColName = numberToColumnName(colCount)

        const [firstRow] = await page.getCellsInRange(
            `A2:${lastColName}2`, {
                valueRenderOption: "UNFORMATTED_VALUE"
            }
        )

        let data = []

        /** @type {import("@evidence-dev/db-commons").ColumnDefinition[]} */
        const cols = page.headerValues.map((v, i) => ({
            evidenceType: inferType(firstRow[i]),
            typeFidelity: "inferred",
            name: v
        }));

        let dataI = 2; // Skip first row; sheets are 1-indexed

        yield {
            rows: async function* () {
                while (dataI <= rowCount) {
                    const remainingRows = rowCount - dataI
                    const size = Math.min(100, remainingRows)
                    const rows = await page.getCellsInRange(`A${dataI}:${lastColName}${dataI + size}`, {
                        valueRenderOption: "UNFORMATTED_VALUE"
                    })
                    if (rows?.length) {
                        data.push(...rows.map(row => Object.fromEntries(cols.map((c, i) => [c.name, cleanValue(row[i])]))))
                        dataI += size;
                        yield data
                        data = []
                    } else {
                        return null;
                    }
                }
            },
            columnTypes: cols,
            name: name + "_" + page.title.replaceAll(" ", "_").toLowerCase(),
            content: name + "_" + page.title
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

export default {options};

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
