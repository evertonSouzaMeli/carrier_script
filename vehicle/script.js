const xlsx = require('xlsx');
const moment = require("moment");
const axios = require("axios");
const fs = require('fs/promises');
const path = require('path');

const root_path = '/Users/evertosilva/Desktop/carrier_script/';


const init = async (carrier_name) => {
    carrier_name = carrier_name.toLowerCase()

    let converted_sheet = await convert_sheet_to_json(carrier_name, await find_by_name_and_extension('../', `${carrier_name}_normalized`, 'xlsx'))

    await export_to_json_file(`vehicle_${carrier_name}`, converted_sheet, './converted_sheet')

    let files = await find_by_name_and_extension('./converted_sheet', carrier_name, 'json')

    let latest_file = files[files.length - 1]

    let vehicles = await parse_data_to_javascript_object('./converted_sheet', latest_file)

    await register_vehicles(vehicles)
}

const parse_data_to_javascript_object = async (folder_path, file_name) => {
    try {
        console.log(`Parsing ${file_name} to Javascript Object...`)
        return JSON.parse((await fs.readFile(`${folder_path}/${file_name}`, null)).toString());
    } catch (err) {
        console.log(err)
    }
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

function get_carrier_id_by_name(carrier_name) {
    if (carrier_name.includes('soltrej'))
        return 1822460296

    else if (carrier_name.includes('go & do'))
        return 23374693

    else if (carrier_name.includes('sahuayo'))
        return 1351061126

    else if (carrier_name.includes('zouny'))
        return 1831025940

    else if (carrier_name.includes('always'))
        return 1964268877

    else if (carrier_name.includes('tdtl'))
        return 118372814

    else if (carrier_name.includes('debora'))
        return 430395015

    else if (carrier_name.includes('ary'))
        return 705217045

    else if (carrier_name.includes('mextrader'))
        return 759235544

    else if (carrier_name.includes('intelo'))
        return 841372176

    else if (carrier_name.includes('sql'))
        return 1172635584

    else if (carrier_name.includes('ruth'))
        return 1758022915

    else if (carrier_name.includes('jobbiton'))
        return 1768213437

    else if (carrier_name.includes('salazar'))
        return 2033511423

    else if (carrier_name.includes('mol'))
        return 522534310

    else
        return null
}

async function get_all_vehicles(carrier_name) {
    try {
        let carrier_id = get_carrier_id_by_name(carrier_name)

        let req = await axios.get('https://internal-api.mercadolibre.com/logistics/vehicles/search', {
            params: {
                'carrier_id': carrier_id
            }
        })

        return req.data;
    } catch (err) {
        throw err
    }
}

const convert_sheet_to_json = async (carrier_name, file) => {
    try {
        let vehicles_list = []

        console.log(`Converting spreadsheet ${file} to JSON format...`)

        const sheet = xlsx.readFile(root_path.concat(file))
        let convertData = [];

        let tempJsonData = xlsx.utils.sheet_to_json(sheet.Sheets['Vehiculos ya registrados'], {defval: null});

        vehicles_list = await get_all_vehicles(carrier_name)

        tempJsonData.forEach(value => {
            let vehicle = vehicles_list.find(res => res.license_plate === value['Placa de Vehiculo'])
            convertData.push({
                id: vehicle ? vehicle.id : null,
                license_plate: value['Placa de Vehiculo'],
                type: {
                    description: value['Tipo de vehículo']
                },
                status: value['Status'],
                year: value['Año de Vehículo'],
                number_of_axles: number_axles_of_the_vehicle(value['Código de configuración del vehículo']),
                configuration_code: value['Código de configuración del vehículo']
            })
        })

        return convertData
    } catch (err) {
        throw err
    }
}

const export_to_json_file = async (name, content, path) => {
    console.log(`Export ${name} to a json file to ${path}`)

    await fs.writeFile(`${path}/${name.replaceAll(' ', '_')}_${moment().format('DD_MM_yyyy_HH:mm:ss')}.json`, JSON.stringify(content, null, 2), function (err) {
        if (err) throw err;
    })
}

const number_axles_of_the_vehicle = (configuration_code) => {
    if (configuration_code)
        configuration_code = configuration_code.toLocaleLowerCase()

    if (configuration_code === 'vl' || configuration_code === 'c2')
        return 2

    else if (configuration_code === 'c3' || configuration_code === 't2s1')
        return 3

    else if (configuration_code === 'c2r2' || configuration_code === 't2s2' || configuration_code === 't3s1')
        return 4

    else if (configuration_code === 'c3r2' || configuration_code === 'c2r3' || configuration_code === 't2s3' || configuration_code === 't3s2' || configuration_code === 't2s1r2')
        return 5

    else if (configuration_code === 'c3r3' || configuration_code === 't3s3' || configuration_code === 't2s2r2' || configuration_code === 't2s1r3' || configuration_code === 't3s1r2' || configuration_code === 't2s2s2')
        return 6

    else if (configuration_code === 't3s1r3' || configuration_code === 't3s2r2' || configuration_code === 't3s2s2')
        return 7

    else if (configuration_code === 't3s2r3' || configuration_code === 't3s3s2')
        return 8

    else if (configuration_code === 't3s2r4')
        return 9

    else
        return null;
}

const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
}

const register_vehicles = async (vehicles) => {
    for (const vehicle of vehicles) {
        try {
            let req = await axios.put(`http://localhost:8080/update_vehicles/${vehicle.id}?`, {
                header: {
                    'Content-Type':'application/json'
                }
            })

            return req.data
        } catch (err) {
            throw err
        }
    }
}


init('soltrej')
