'use strict';
/**
 * Created by Apart-Filipe on 12/01/17.
 */

const request = require('superagent');
const toJSON = require('xmljson').to_json;
const crypto = require('crypto');

class Fritzbox {
    
    constructor(aUsername,aPassword,aHost = null){
        
        this.username = aUsername;
        this.password = aPassword;
        
        this.host = aHost || 'fritz.box';
        this.path = this.host + '/login_sid.lua';
        
        this.SID = null;
        
    }

    /**
     * 
     * @returns {Promise}
     */
    authenticate(){
        
        return new Promise((resolve, reject) => {

            this.getChallenge()
                .then( (aChallenge) => {
                    return this.solveChallenge(aChallenge);
                })
                .then( (aSolvedChallenge) => {
                                       
                    request
                        .get(this.path)
                        .query({
                            username: this.username,
                            response : aSolvedChallenge
                        })
                        .end((error, reponse) => {

                            if(error){
                                reject(error);
                            }

                            toJSON(reponse.text, (jsonError, data)  => {

                                if(jsonError) {
                                    reject(jsonError)
                                }
                                
                                this.SID = data.SessionInfo.SID;
                                
                                resolve(this.SID);

                            });

                        });
                    
                })
              
        });
        
    }

    /**
     * 
     * @returns {Promise}
     */
    getChallenge(){
        
        return new Promise((resolve, reject) => {

            request
                .get(this.path)
                .end((error, response) => {
                    
                    if(error){
                        reject(error);
                    }

                    toJSON(response.text, (jsonError, data)  => {

                        if(jsonError) {
                            reject(jsonError)
                        }
                        
                        if(!data.SessionInfo){
                            reject('SessionInfo not found');
                        }
                        
                        resolve(data.SessionInfo.Challenge);

                    });
                    
                });
        });
        
    }
    
    solveChallenge(aChallenge){
        return new Promise((resolve, reject) => {
            resolve(aChallenge+'-'+crypto.createHash('md5').update(Buffer(aChallenge + '-' + this.password, 'UTF-16LE')).digest('hex'));
        });
    }
    
    checkSession(){
        
        return new Promise((resolve, reject) => {

            request
                .get(this.path)
                .end((error, reponse) => {

                    if(error){
                        reject(error);
                    }

                    toJSON(reponse.text, (jsonError, data)  => {

                        if(jsonError) {
                            reject(jsonError)
                        }

                        if(data.SessionInfo.SID !== this.SID){
                            reject('Session expired or invalidated');
                        }

                        resolve();

                    });

                });

        });
    }
    
    getBandwidth(){

        return new Promise((resolve, reject) => {

            let date = new Date();
            let path = this.host + `/internet/inetstat_monitor.lua?t${date}=nocache`;

            request
                .get(path)
                .query({
                    sid : this.SID,
                    useajax : 1,
                    action : 'get_graphic',
                    xhr : 1
                })
                .end((error, response) => {

                    if(error){
                        reject(error);
                    }
                    
                    // Note : I'm doing some math here to get basic bandwidth information, maybe return everything and provide an other method where we return the clean stuff only
                    
                    let stats = JSON.parse(response.text);
                    
                    let actualUpstream  = stats[0].prio_realtime_bps[0] 
                        + stats[0].prio_high_bps[0] 
                        + stats[0].prio_low_bps[0] 
                        + stats[0].prio_realtime_bps[0];
                    
                    let actualDownstream = stats[0].ds_current_bps[0] + stats[0].mc_current_bps[0];
                    
                    resolve({
                        current : {
                            upstream : (actualUpstream * 0.008).toFixed(2), // convert from byte/s to kbit/s
                            downstream : (actualDownstream * 0.008).toFixed(2) // convert from byte/s to kbit/s
                        },
                        available : {
                            upstream : stats[0].upstream / 1000,
                            downstream : stats[0].downstream / 1000,
                        }
                       
                    });
                    
                });

        });
        
    }
    
    getDevices(){

        return new Promise((resolve, reject) => {

            let date = new Date();
            let path = this.host + `/data.lua`;

            request
                .get(path)
                .query({
                    sid : this.SID,
                    useajax : 1,
                    xhr : 1,
                    page : 'netDev',
                    type : 'cleanup'
                })
                .end((error, response) => {

                    if(error){
                        reject(error);
                    }
                    
                    let result = JSON.parse(response.text);
                    
                    resolve({
                        active : result.data.active,
                        passive : result.data.passive,
                        fbox : result.data.fbox
                    });

                });
            
        });
            
    }
    
}

module.exports = Fritzbox;