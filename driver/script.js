const xlsx = require('xlsx');
const moment = require("moment");
const axios = require("axios");
const fs = require('fs/promises');
const path = require('path');

const root_path = '/Users/evertosilva/Desktop/carrier_script/';

const init = async (carrier_name) => {
    carrier_name = carrier_name.toLowerCase()

    let converted_sheet = convert_sheet_to_json(await find_by_name_and_extension('../', `${carrier_name}_normalized`, 'xlsx'))

    await export_to_json_file(`driver_${carrier_name}`, converted_sheet, './converted_sheet')

    let files = await find_by_name_and_extension('./converted_sheet', carrier_name, 'json')

    let latest_file = files[files.length - 1]

    let drivers = await parse_data_to_javascript_object('./converted_sheet', latest_file)

    await generate_divergent_json(carrier_name, drivers)

    await verify_drivers_without_rfc(carrier_name, drivers)

    await backup(carrier_name, drivers)

    await register_drivers(carrier_name, drivers)
}

const get_carrier_id_by_driver_id = async (driver_id) => {
    try {
        console.log("Getting carrier id...")

        let req = await axios.get(`https://internal-api.mercadolibre.com/logistics/drivers/${driver_id}`, {
            params: {
                'scope': 'prod'
            }
        })

        return req.data.carrier_id
    } catch (err) {
        throw err
    }
}


const generate_divergent_json = async (carrier_name, drivers) => {
    try {
        console.log(`Checking for divergent drivers from the carrier ${carrier_name}`)

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

        let diff_between_drivers_list = res.filter(driver1 => !drivers.some(driver2 => driver1.driver_id === driver2.id));

        if(diff_between_drivers_list.length > 0){
            await export_to_json_file(`divergent_driver_${carrier_name}`, diff_between_drivers_list, './divergent_driver')
        }
    } catch (err) {
        throw err
    }
}

const backup = async (carrier_name, drivers) => {
    console.log('Creating backup file for drivers...')
    let backup_list = []

    for (const driver of drivers) {
        try {
            let req = await axios.get(`https://internal-api.mercadolibre.com/logistics/drivers/${driver.id}`, {
                params: {
                    'scope': 'prod',
                    'include_other_identifications': 'RFC'
                }
            })

            backup_list.push(req.data)
        } catch (err) {
            throw err
        }
    }

    if(backup_list.length > 0) {
        await export_to_json_file(`backup_${carrier_name}`, backup_list, './backup_driver')
    }}

const register_drivers = async (value) => {
    console.log(`Calling API to register driver ${value.id}`)
    axios.defaults.timeout = 5000;

    if(!Object.values(value).every(x => x === null)){
        let req = await axios.post('https://driver-fiscal-data.melioffice.com/logistics-fiscal-data/MLM/drivers', value, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-scope': 'stage'
            }
        })
    }
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
    } catch (err) {
        throw err
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

            if (fileExt === `.${ext}` && file.toLowerCase().includes(name)) {
                matchedFiles.push(file);
            }
        }

        return matchedFiles;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log("File not found, check if the name, path or extension are correct")
        } else {
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

const verify_drivers_without_rfc = async (carrier_name, drivers) => {
    console.log('Checking for drivers without RFC...')
    let drivers_without_rfc = []

    for (const driver of drivers) {
        try {
            let req = await axios.get(`https://internal-api.mercadolibre.com/logistics/drivers/${driver.id}`, {
                params: {
                    'scope': 'prod',
                    'include_other_identifications': 'RFC'
                }
            })

            let res = req.data

            if (res['identification']['type'] !== 'RFC')
                drivers_without_rfc.push(driver)

        } catch (err) {
            throw err
        }
    }

    if(drivers_without_rfc.length > 0) {
        console.log('Creating a file with drivers without rfc! send again an email requesting to fill in this information ')
        await export_to_json_file(`driver_without_rfc_${carrier_name}`, drivers_without_rfc, './drivers_without_rfc')
    }
}


init('sahuayo')
