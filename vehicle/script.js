const xlsx = require('xlsx');
const moment = require("moment");
const axios = require("axios");
const fs = require('fs/promises');
const path = require('path');

const root_path = 'Colocar o diretorio ROOT';

/** release ou prod **/
const scope = 'release'

const token = "FURY_TOKEN"

const init = async (carrier_name) => {
    carrier_name = carrier_name.toLowerCase()

    let converted_sheet = await convert_sheet_to_json(carrier_name, await find_by_name_and_extension('../', `${carrier_name}_normalized`, 'xlsx'))

    await export_to_json_file(`vehicle_${carrier_name}`, converted_sheet, './converted_sheet')

    let files = await find_by_name_and_extension('./converted_sheet', carrier_name, 'json')

    let latest_file = files[files.length - 1]

    let vehicles = await parse_data_to_javascript_object('./converted_sheet', latest_file)

    await backup(carrier_name)

    await register_vehicles(carrier_name, vehicles)
}

const parse_data_to_javascript_object = async (folder_path, file_name) => {
    try {
        console.log(`Parsing ${file_name} to Javascript Object...`)
        return JSON.parse((await fs.readFile(`${folder_path}/${file_name}`, null)).toString());
    } catch (err) {
        throw err
    }
}

const backup = async (carrier_name) => {
    console.log('Creating backup file for vehicles...')
    let backup_list = await get_all_vehicles(carrier_name)

    if (backup_list.length > 0) {
        await export_to_json_file(`backup_${carrier_name}`, backup_list, './backup_vehicle')
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
                'carrier_id': carrier_id,
                'scope': scope
            },
            headers: {
                'Accept-Encoding': 'application/json'
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
                year: value['Año de Vehículo'],
                invoice_code_configuration: value["Código de configuración del vehículo"]
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

const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
}

function getScope(scope) {
    switch (scope) {
        case 'prod':
            return 'test-production'
        case 'release':
            return 'stage'
        default:
            throw Error();
    }
}

async function verify_if_vehicle_updated(carrier_name, registered_vehicles, unregistered_vehicles) {
    let messages = []
    for (const vehicle of registered_vehicles) {
        console.log(`Checking if the vehicle ${vehicle.id} has been updated`)
        let req = await axios.get(`https://internal-api.mercadolibre.com/logistics/vehicles/${vehicle.id}`, {
            params: {
                'scope': scope
            },
            headers: {
                'Content-Type': 'application/json'
            }
        })

        let res = req.data

        let updated = (vehicle.invoice_code_configuration === res.invoice_code_configuration) && (vehicle.year === res.year)

        let message = `Vehicle ${vehicle.id} `.concat(updated ? `was updated successfully` : `has not been updated`)

        messages.push(message)

        console.log(message)

        await sleep(3000)
    }

    for(const vehicle of unregistered_vehicles){
        messages.push(`Vehicle ${vehicle.id} has not been updated, cause: ${vehicle['cause']}`)
    }

    await fs.writeFile(`./result_updated/${carrier_name.replaceAll(' ', '_')}_${moment().format('DD_MM_yyyy_HH:mm:ss')}.txt`, JSON.stringify(messages, null, 2), function (err) {
        if (err) throw err;
    })
}

const register_vehicles = async (carrier_name, vehicles) => {
    let registered_vehicles = []
    let unregistered_vehicles = []
    let cause_error;

    for (const vehicle of vehicles) {
        try {
            if (Object.values(vehicle).every(x => x !== null)) {
                let url = `https://${getScope(scope)}_mback-warning-message-agent.furyapps.io/update_vehicles/${vehicle.id}`;

                let req = await axios.put(url, vehicle, {
                    headers: {
                        'x-tiger-token': 'Bearer '.concat(token),
                        'Content-Type': 'application/json',
                    }
                })

                let update_vehicle = req.data;

                console.log(`Vehicle ${req.data.id} successfully updated`)
                registered_vehicles.push(update_vehicle)
            }else {
                cause_error = 'NULL_INFORMATION'
                console.log(`Unable to update the vehicle ${vehicle.id} because contains null information`)
                unregistered_vehicles.push({ id: vehicle.id, cause: cause_error})
            }
        } catch (err) {
            switch (err.response.status) {
                case 403:
                    cause_error = "FORBIDDEN"
                    unregistered_vehicles.push({ id: vehicle.id, cause: cause_error})
                    console.log(err.response.data)
                    break
                case 400:
                    cause_error = "BAD_REQUEST"
                    unregistered_vehicles.push({ id: vehicle.id, cause: cause_error})
                    console.log(err.response.data.message)
                    break
                case 404:
                    cause_error = "NOT_FOUND"
                    unregistered_vehicles.push({ id: vehicle.id, cause: cause_error})
                    console.log(err.response.data)
                    break
                default:
                    cause_error = 'CODE_EXCEPTION'
                    unregistered_vehicles.push({ id: vehicle.id, cause: cause_error})
                    console.log(err)
                    break;
            }
        }
    }

    if (registered_vehicles.length > 0 || unregistered_vehicles.length > 0) {
        await verify_if_vehicle_updated(carrier_name, registered_vehicles, unregistered_vehicles)
    }
}

init('').then(() => console.log('END'))
