const fs = require('fs');
const https = require('https');
const axios = require('axios');

const init = async () => {
    console.log("Carrier Script Start")
}

const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
}
