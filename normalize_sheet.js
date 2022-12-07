const moment = require("moment");
const fs = require('fs/promises');
const path = require('path');
const xlsx = require("xlsx");
const Excel = require('exceljs');

const root_path = '/Users/evertosilva/Desktop/carrier_script/';

const wb = new Excel.Workbook();

const init = async (carrier_name) => {
    let file = await find_by_name_and_extension('./', `${carrier_name}_non_normalized`, 'xlsx')

    await normalize_sheet(file, 'Conductores ya registrados')

    await normalize_sheet(file, 'Vehículo ya registrados')

    await wb.xlsx.writeFile(`./Conductor y Vehiculo - ${carrier_name}_normalized.xlsx`)

    console.log('END')
}

const normalize_sheet = async (file, tab) => {
    const sheet = xlsx.readFile(root_path.concat(file))
    let newSheet = []
    let column_1 = []
    let column_2 = []
    let header = []

    let tempJsonData = xlsx.utils.sheet_to_json(sheet.Sheets[tab], {defval: null});

    tempJsonData.forEach(function (value, index) {
        if (tab === 'Conductores ya registrados') {
            column_1.push(value['__EMPTY'])
            column_2.push(value['__EMPTY_3'])
        }

        else if (tab === 'Vehículo ya registrados') {
            column_1.push(value['__EMPTY'])
            column_2.push(value['__EMPTY_4'])
        }
    })

    column_1.push(...column_2)

    if (tab === 'Conductores ya registrados') {
        const ws_driver = wb.addWorksheet('Conductores ya registrados')

        header = ['driver_id', 'CURP', 'Nombre', 'Status', 'Tipo de conductor', 'RFC de conductor', 'Licencia de conductor']

        while (column_1.length) {
            let row = column_1.splice(0, 7)

            if (row[0] !== null)
                newSheet.push(row)
        }

        newSheet.unshift(header)

        ws_driver.addRows(newSheet);
    }

    if (tab === 'Vehículo ya registrados') {
        const ws_vehicle = wb.addWorksheet('Vehiculos ya registrados')

        header = ['Status', 'Placa de Vehiculo', 'Año de Vehículo', 'Código de configuración del vehículo', 'Tipo de vehículo']

        while (column_1.length) {
            let row = column_1.splice(0, 5)

            if (row[0] !== null)
                newSheet.push(row)
        }

        newSheet.unshift(header)

        ws_vehicle.addRows(newSheet)
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
}


init('sahuayo')
