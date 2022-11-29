const xlsx = require('xlsx');
const moment = require("moment");
const axios = require("axios");
const fs = require('fs/promises');
const path = require('path');

const root_path = '/Users/evertosilva/Desktop/carrier_script/';

const init = async () => {
    //let converted_sheet = convert_sheet_to_json(await find_by_name_and_extension('../', 'Conductor y Vehiculo', 'xlsx'))

    //await export_to_json_file('driver', converted_sheet, './converted_sheet')

    let files = await find_by_name_and_extension('./converted_sheet', 'driver', 'json')

    let latest_file = files[files.length - 1]

    let parsedData = await parse_data_to_javascript_object('./converted_sheet', latest_file)

    let x = await generate_divergent_json(parsedData)
}

const get_carrier_id_by_driver_id = async (driver_id) =>{
    try{
        console.log("Getting carrier id...")

        let req = await axios.get(`https://internal-api.mercadolibre.com/logistics/drivers/${driver_id}`, {
            params: {
                'scope': 'prod'
            }
        })

        return req.data.carrier_id
    }catch (err){
        throw err
    }
}


const generate_divergent_json = async (drivers) => {
    console.log(`Checking for divergent drivers from the carrier ${1}`)

    let carrier_id = await get_carrier_id_by_driver_id(drivers[0].id)

    axios.defaults.timeout = 5000;

    let req = await axios.get('https://internal-api.mercadolibre.com/logistics/drivers/search', {
        params: {
            'carrier_id': carrier_id
        }, headers: {
            'X-With-Kyc-User-Id': true
        }
    })

    let res = req.data

    //comparar as duas listas e ver valores diferentes
    let diff_between_list = res.filter(value => !drivers.includes(value.id));

    console.log('LISTA')
    console.log(diff_between_list)
}

const backup = async () => {
    console.log("Create backup of drivers...")
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

const export_to_json_file = async (name, content, path) => {
    console.log(`Export ${name} to a json file to ${path}`)

    await fs.writeFile(`${path}/${name}_${moment().format('DD_MM_yyyy_HH:mm:ss')}.json`, JSON.stringify(content, null, 2), function (err) {
        if (err) throw err;
    })
}

const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
}


const find_by_name_and_extension = async (dir, name, ext) => {
    try {
        const matchedFiles = [];

        const files = await fs.readdir(dir);

        for (const file of files) {
            const fileExt = path.extname(file);

            if (fileExt === `.${ext}` && file.startsWith(name)) {
                matchedFiles.push(file);
            }
        }

        return matchedFiles;
    }catch (err){
        if (err.code === 'ENOENT') {
            console.log("File not found, check if the name, path or extension are correct")
        }else {
            throw err
        }
    }
};

const parse_data_to_javascript_object = async (folder_path, file_name) => {
    try {
        console.log(`Parsing ${file_name} to Javascript Object...`)
        return JSON.parse((await fs.readFile(`${folder_path}/${file_name}`, null)).toString());
    } catch (err) {
        console.log(err)
    }
}


init()
