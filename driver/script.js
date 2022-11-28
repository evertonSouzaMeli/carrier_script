const https = require('https');
const xlsx = require('xlsx');
const moment = require("moment");
const axios = require("axios");
const fs = require('fs/promises');
const path = require('path');

const root_path = '/Users/evertosilva/Desktop/carrier_script/';

const init = async () => {
    //let converted_sheet = convert_sheet_to_json(await find_by_file_name_and_file_extension('../', 'Conductor y Vehiculo', 'xlsx'))

    //export_to_json_file('driver', converted_sheet, './converted_sheet')

    let files = await find_by_file_name_and_file_extension('./converted_sheet', 'driver_27_11_2022', 'json')

    let parsedData = await parse_data_to_javascript_objetct('./converted_sheet', files[0])
}

const generate_divergent_json = () => {

}

const backup = async () => {

}

const register_drivers = async (value) => {
    console.log(`Calling API to register driver ${value.id}`)
    axios.defaults.timeout = 5000;

    let req = await axios.post('https://driver-fiscal-data.melioffice.com/logistics-fiscal-data/MLM/drivers', value, {
        headers: {
            'Content-Type': 'application/json',
            'x-api-scope': 'stage'
        }
    }).catch(err => /*colocar circuit breaker err*/ err)
}

const convert_sheet_to_json = (file) => {
    try {
        console.log(`Converting spreadsheet ${file} to JSON format...`)

        const sheet = xlsx.readFile(root_path.concat(file))
        let convertData = [];

        let tempJsonData = xlsx.utils.sheet_to_json(sheet.Sheets['Conductores ya registrados'], {defval: null});

        tempJsonData.forEach(value => {
            convertData.push({
                id: value['driver_id'],
                carrier_type: value['Tipo de conductor'],
                licenses_infos: [
                    {
                        key: "LICENCIA",
                        value: value['Licencia de conductor']
                    }
                ]
            })
        })

        return convertData
    } catch
        (e) {
        throw new Error()
    }
}

const export_to_json_file = (name, content, path) => {
    console.log(`Export ${name} to a json file to ${path}`)

    fs.writeFile(`${path}/${name}_${moment().format('DD_MM_yyyy_HH:mm:ss')}.json`, JSON.stringify(content, null, 2), function (err) {
        if (err) throw err;
    })
}

const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
}


const find_by_file_name_and_file_extension = async (dir, name, ext) => {
    const matchedFiles = [];

    const files = await fs.readdir(dir);

    for (const file of files) {
        const fileExt = path.extname(file);

        if (fileExt === `.${ext}` && file.startsWith(name)) {
            matchedFiles.push(file);
        }
    }

    return matchedFiles;
};

const parse_data_to_javascript_objetct = async (folder_path, file_name) => {
    try {
        console.log(`Parsing ${file_name} to Javascript Object...`)
        return JSON.parse(await fs.readFile(`${folder_path}/${file_name}`, null));
    } catch (err) {
        console.log(err)
    }
}


init()
