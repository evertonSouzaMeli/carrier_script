const xlsx = require('xlsx');
const moment = require("moment");
const axios = require("axios");
const fs = require('fs/promises');
const path = require('path');

const root_path = 'DIRETORIO ROOT';

const init = async (carrier_name) => {
  carrier_name = carrier_name.toLowerCase()

  let converted_sheet = convert_sheet_to_json(await find_by_name_and_extension('', `${carrier_name}_normalized`, 'xlsx'))

  await export_to_json_file(`driver_${carrier_name}`, converted_sheet, 'converted_sheet')

  let files = await find_by_name_and_extension('driver/converted_sheet', carrier_name, 'json')

  let latest_file = files[files.length - 1]

  let drivers = await parse_data_to_javascript_object('driver/converted_sheet', latest_file)

  await generate_divergent_json(carrier_name, drivers)

  await verify_drivers_rfc(carrier_name, drivers)

  await register_drivers(carrier_name, drivers)
}

const generate_divergent_json = async (carrier_name, drivers) => {
  try {
    console.log(`Checking for divergent drivers from the carrier ${carrier_name}`)

    let carrier_id = get_carrier_id_by_name(carrier_name)

    let req = await axios.get('https://internal-api.mercadolibre.com/logistics/drivers/search', {
      params: {
        'carrier_id': carrier_id
      },
      responseType: 'json',
      headers: {
        'X-With-Kyc-User-Id': true,
        'Accept-Encoding': 'application/json'
      }
    })

    let res = req.data

    let diff_between_drivers_list = res.filter(driver1 => !drivers.some(driver2 => driver1['driver_id'].toString() === driver2.id));

    if (diff_between_drivers_list.length > 0) {
      await export_to_json_file(`divergent_driver_${carrier_name}`, diff_between_drivers_list, './divergent_driver')
    }
  } catch (err) {
    throw err
  }
}

const verify_if_driver_registered = async (carrier_name, registered_drivers, unregistered_drivers) => {
  let messages = []
  for (const driver of registered_drivers) {
    console.log(`Checking if the driver ${driver.id} has been updated`)
    let req = await axios.get(`https://driver-fiscal-data.melioffice.com/logistics-fiscal-data/MLM/drivers/${driver.id}`, {
      headers: {
        'x-api-scope': 'stage',
        'Content-Type': 'application/json'
      }
    })

    let res = req.data

    let updated = driver === res

    let message = `Driver ${driver.id} `.concat(updated ? `was registered successfully` : `has not been registered`)

    messages.push(message)

    console.log(message)

    await sleep(3000)
  }

  for (const driver of unregistered_drivers) {
    messages.push(`Driver ${driver.id} has not been registered, cause: ${driver['cause']}`)
  }

  await fs.writeFile(`./result_registered/${carrier_name.replaceAll(' ', '_')}_${moment().format('DD_MM_yyyy_HH:mm:ss')}.txt`, JSON.stringify(messages, null, 2), function (err) {
    if (err) throw err;
  })
}

const register_drivers = async (carrier_name, drivers) => {
  let registered_drivers = []
  let unregistered_drivers = []
  let cause_error

  for (const driver of drivers) {

    delete driver.rfc

    try {
      if (Object.values(driver).every(x => x !== null)) {
        console.log(`Calling API to register driver ${driver.id}`)
        console.log(driver.driver_id)
        let req = await axios.post('https://driver-fiscal-data.melioffice.com/logistics-fiscal-data/MLM/drivers', driver, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-scope': 'stage'
          }
        })

        console.log(`Driver ${req.data.id} successfully registered`)
        registered_drivers.push({ id: driver.id })

        await sleep(3000)
      } else {
        cause_error = 'NULL_INFORMATION'
        unregistered_drivers.push({ id: driver.id, cause: cause_error })
        console.log(`Unable to register the driver ${driver.id} because contains null information`)
      }
    } catch (err) {
      switch (err.response.status) {
        case 403:
          cause_error = "FORBIDDEN"
          unregistered_drivers.push({ id: driver.id, cause: cause_error })
          console.log(err.response.data)
          break
        case 400:
          cause_error = "BAD_REQUEST"
          unregistered_drivers.push({ id: driver.id, cause: cause_error })
          console.log(err.response.data.message)
          break
        case 404:
          cause_error = "NOT_FOUND"
          unregistered_drivers.push({ id: driver.id, cause: cause_error })
          console.log(err.response.data)
          break
        default:
          cause_error = 'CODE_EXCEPTION'
          unregistered_drivers.push({ id: driver.id, cause: cause_error })
          console.log(err)
          break;
      }
    }
  }

  if (registered_drivers.length > 0 || unregistered_drivers.length > 0) {
    await verify_if_driver_registered(carrier_name, registered_drivers, unregistered_drivers)
  }
}

const convert_sheet_to_json = (file) => {
  try {
    console.log(`Converting spreadsheet ${file} to JSON format...`)

    const sheet = xlsx.readFile(root_path.concat(file))
    let convertData = [];

    let tempJsonData = xlsx.utils.sheet_to_json(sheet.Sheets['Conductores ya registrados'], { defval: null });

    tempJsonData.forEach(value => {
      convertData.push({
        id: value['driver_id'].toString(),
        carrier_type: value['Tipo de conductor'],
        rfc: value['RFC de conductor'],
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

  await fs.writeFile(`${root_path}/driver/${path}/${name}_${moment().format('DD_MM_yyyy_HH:mm:ss')}.json`, JSON.stringify(content, null, 2), function (err) {
    if (err) throw err;
  })
}

const sleep = (time) => {
  return new Promise(resolve => setTimeout(resolve, time));
}


const find_by_name_and_extension = async (dir, name, ext) => {
  try {
    const matchedFiles = [];

    const directory = `${root_path}${dir}`

    const files = await fs.readdir(directory);

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
    return JSON.parse((await fs.readFile(`${root_path}${folder_path}/${file_name}`, null)).toString());
  } catch (err) {
    throw err
  }
}

const verify_drivers_rfc = async (carrier_name, drivers) => {
  console.log('Checking for drivers without RFC...')
  let drivers_without_rfc = []
  let drivers_with_divergent_rfc = []

  for (const driver of drivers) {
    let rfc;

    try {
      let req = await axios.get(`https://internal-api.mercadolibre.com/logistics/drivers/${driver.id}`, {
        params: {
          'scope': 'prod',
          'include_other_identifications': 'RFC'
        }
      })

      console.log(`Success to find driver ${driver.id}...`)

      let res = req.data

      if (res['other_identifications'])
        rfc = res['other_identifications'].find(value => value.type === 'RFC')


      if (!rfc) {
        drivers_without_rfc.push(res)
      } else if (driver.rfc !== rfc.value) {
        drivers_with_divergent_rfc.push({ id: driver.id, sheet_rfc: driver.rfc, base_rfc: rfc.value })
      }

      await sleep(3000)

    } catch (err) {
      console.log(err)
      break
    }
  }

  if (drivers_without_rfc.length > 0) {
    console.log('Creating a file with drivers without rfc! send again an email requesting to fill in this information ')
    await export_to_json_file(`driver_without_rfc_${carrier_name}`, drivers_without_rfc, './drivers_without_rfc')
  }

  if (drivers_with_divergent_rfc.length > 0) {
    console.log('Creating a file with drivers with divergent rfc! send again an email requesting to fix this information ')
    await export_to_json_file(`driver_with_divergent_rfc_${carrier_name}`, drivers_with_divergent_rfc, './drivers_with_divergent_rfc')
  }
}

const get_carrier_id_by_name = (carrier_name) => {
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

init('').then(() => console.log('END'))
