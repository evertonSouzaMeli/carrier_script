const fs = require('fs');
const https = require('https');
const axios = require('axios');
const xlsx = require('xlsx');
const moment = require("moment");

const root_path = '/Users/evertosilva/Desktop/carrier_script/';

const init = () => {

}

const generate_divergent_json = () => {

}

const backup = async () => {

}

const convert_sheet_to_json = (file) => {
    try {
        console.log(`Converting spreadsheet ${file} to JSON format...`)

        const sheet = xlsx.readFile(root_path.concat(file))
        let convertData = [];

        let tempJsonData = xlsx.utils.sheet_to_json(sheet.Sheets['Vehículo ya registrados'], {defval: null});

        tempJsonData.forEach(value => {
            convertData.push({
                license_plate: value['Placa de Vehículo'],
                type: {
                    description: value['Tipo de vehículo']
                },
                status: value['Status'],
                vehicle_year: value['Año de Vehículo'],
                configuration_code: value['Código de configuración del vehículo']
            })
        })

        return convertData
    } catch (e) {
        throw new Error()
    }
}

const exportToJson = (name, content) => {
    console.log(`Export ${name} to a json file`)
    fs.writeFile(`./${name}_${moment().format('DD_MM_yyyy_hh:mm:ss')}.json`, JSON.stringify(content, null, 2), function (err) {
        if (err) throw err;
    })
}

const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
}


init()
