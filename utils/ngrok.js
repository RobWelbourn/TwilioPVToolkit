/**
 * @module ngrok
 * 
 * Queries the local Ngork Agent API to get tunnel information.
 * @see {@link https://ngrok.com/docs/ngrok-agent/api/}
 */

/**
 * Gets information about an Ngrok tunnel from the Ngrok Agent local API, if it is running.
 * @returns {Promise} - Returns an object containing {publicUrl, localPort} when the Promise is resolved
 */
export function getTunnelInfo() {
    return fetch('http://127.0.0.1:4040/api/tunnels')
        .then(response => response.json())
        .then(obj => 
            ({
                publicUrl: obj.tunnels[0].public_url,
                localPort: parseInt(obj.tunnels[0].config.addr.split(':')[2])
            }))
        .catch(err => { 
            throw new Error('Ngrok Agent is not running', {cause: err});
        });
}