'use strict';

//
// Config

require('dotenv').config(); // Load needed vars from .env file if it exists

//
// Load all needed modules

const fritzbox = require('./fritzbox');

const myBox = new fritzbox(process.env.USERNAME,process.env.PASSWORD);

myBox.authenticate().then( () => {
    
    console.log('authenticate successful');
    
    // Note : We just as once and exit for now. Add a setInterval (or similar) if you need to. 
    myBox.getBandwidth()
        .then( (aBandwidth) => {
            
            console.log('Bandwidth',aBandwidth)
            
        });
    
});