const axios = require('axios');
const fs = require('fs');
const QRCode = require('qrcode');
const { exec } = require('child_process');

function getLoginToken(userAgent) {
    // const requestUrl = "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/auth/auth_login_code";
    const requestUrl = "https://channels.weixin.qq.com/promote/api/web/auth/auth_login_token"
    const headers = {
        'Origin': 'https://channels.weixin.qq.com',
        'Referer': 'https://channels.weixin.qq.com/promote/pages/platform/login-iframe',
        'User-Agent': userAgent,
        'Content-Type': 'application/json'
    };

    const timestampMs = Date.now();
    const requestData = {
        // "timestamp": timestampMs.toString(),
        // "_log_finder_uin": "",
        // "_log_finder_id": "",
        // "rawKeyBuff": null,
        // "pluginSessionId": null,
        // "scene": 7,
        // "reqScene": 7
        _rid: '67501aa0-adc8372e',
        _vid: '42724dd8-4b0b793'
    };

    return axios.post(requestUrl, requestData, { headers: headers })
        .then(response => {
            const jsonObj = response.data;
            return jsonObj['data']['token'];
        })
        .catch(error => {
            console.error("获取登录token出错：", error);
        });
}

function createQRCode(login_token) {
    const url = "https://channels.weixin.qq.com/promote/pages/mobile_login?token=" + login_token
    QRCode.toFile('shipinhao_qrcode.png', url, {
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (err) {
        if (err) throw err;
        console.log('二维码已生成！');
        exec('open shipinhao_qrcode.png', (err) => {
            if (err) throw err;
            console.log('已打开二维码图片！');
        });
    });
}

function checkLoginStatus(userAgent, loginToken) {
    const requestUrl = "https://channels.weixin.qq.com/promote/api/web/auth/auth_login_status";

    const headers = {
        'Origin': 'https://channels.weixin.qq.com',
        'Referer': 'https://channels.weixin.qq.com/promote/pages/platform/login-iframe',
        'User-Agent': userAgent,
        'Content-Type': 'application/json'
    };

    return new Promise((resolve, reject) => {
        function checkStatus() {
            const timestampMs = Date.now();
            const requestParams = {
                // "token": loginToken,
                // "timestamp": timestampMs.toString(),
                // "_log_finder_uin": undefined,
                // "_log_finder_id": undefined,
                // "scene": 7,
                // "reqScene": 7
                _rid: '67501aa0-adc8372e',
                _vid: '42724dd8-4b0b793'
            };
            console.log(requestParams)

            axios.post(requestUrl, { token: loginToken }, { headers: headers, params: requestParams })
                .then(response => {
                    const jsonObj = response.data;
                    console.log("login status: \n", jsonObj);
                    if (!jsonObj || !jsonObj['data']) {
                        console.error("Unexpected response format:", jsonObj);
                        reject("Unexpected response format");
                        return;
                    }
                    const status = jsonObj['data']['status'];
                    if (status === 0) {
                        console.log("等待扫码...");
                        setTimeout(checkStatus, 2000);
                    } else if (status === 1) {
                        console.log("登录成功!");
                        const setCookies = response.headers['set-cookie'];
                        const cookieStr = setCookies.join('; ');
                        resolve(cookieStr);
                    } else if (status === 4) {
                        console.log("二维码已过期，请重新生成");
                        reject("二维码已过期");
                    } else {
                        console.log("等待扫码...");
                        setTimeout(checkStatus, 2000);
                    }
                })
                .catch(error => {
                    console.error("检查登录状态出错：", error);
                    reject(error);
                });
        }
        checkStatus();
    });
}

async function login(userAgent) {
    try {
        const loginToken = await getLoginToken(userAgent);
        console.log("login_token: \n", loginToken);

        createQRCode(loginToken);

        const cookieContent = await checkLoginStatus(userAgent, loginToken);
        console.log("cookie_content: \n", cookieContent);
        fs.writeFileSync('shipinhao_cookie.txt', cookieContent, 'utf8');
    } catch (error) {
        console.error("登录流程出错：", error);
    }
}

const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
login(userAgent);
