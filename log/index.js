const pathNotToLog = process.env.LOG_UTIL_PATH_NOT_TO_LOG
    ? process.env.LOG_UTIL_PATH_NOT_TO_LOG.split(',')
    : ['healthCheck', 'webHealth', 'health'];

const reqHeaderNotToLog = process.env.LOG_UTIL_HEADER_NOT_TO_LOG
    ? process.env.LOG_UTIL_HEADER_NOT_TO_LOG.split(',')
    : ['x-forwarded-for', 'dnt', 'authorization', 'access-control-allow-methods', 'content-type', 'access-control-allow-origin', 'accept', 'referer', 'accept-encoding', 'accept-language', 'cookie', 'connection'];

const keysNotToLog = process.env.LOG_UTIL_KEYS_NOT_TO_LOG
    ? process.env.LOG_UTIL_KEYS_NOT_TO_LOG.split(',')
    : ['token', 'password'];

var counter = 0;

function omitKeys(ip, isJson) {
    try {
        if (isJson)
            return JSON.stringify(ip, function (key, value) {
                return keysNotToLog.includes(key) ? undefined : value;
            });
        else
            return JSON.stringify(JSON.parse(ip, function (key, value) {
                return keysNotToLog.includes(key) ? undefined : value;
            }));
    }
    catch (e) {
        return JSON.stringify(ip);
    }
}

function deleteProps(obj, properties) {
    for (let property of properties)
        (property in obj) && (delete obj[property]);
}

function log() {
    return function (req, res, next) {
        let path = req.path.split('/').slice(-1)[0];
        if (pathNotToLog.includes(path)) {
            next();
            return;
        }
        const logger = global.logger;
        var reqId = counter++;
        if (reqId == Number.MAX_VALUE) {
            reqId = counter = 0;
        }
        logger.info(reqId + ' ' + req.ip + ' ' + req.method + ' ' + req.originalUrl);

        let headers = req.headers ? JSON.parse(JSON.stringify(req.headers)) : {};
        deleteProps(headers, reqHeaderNotToLog);
        logger.debug(reqId + ' ' + 'Request Headers - ' + JSON.stringify(headers));
        if (req.body) {
            logger.debug(reqId + ' ' + 'Request Payload - ' + omitKeys(req.body, true));
        }

        // log response body
        var oldWrite = res.write,
            oldEnd = res.end;
        var chunks = [];
        var body;
        res.write = function (chunk) {
            chunks.push(new Buffer(chunk));
            oldWrite.apply(res, arguments);
        };

        res.end = function (chunk) {
            if (chunk) chunks.push(new Buffer(chunk));
            body = Buffer.concat(chunks).toString('utf8');
            oldEnd.apply(res, arguments);
        };

        res.on('finish', function () {
            if (pathNotToLog.includes(path)) {
                next();
                return;
            }
            if (res && res.statusCode && res.statusCode != 200) {
                logger.error(reqId + ' ' + 'Response Status Code - ' + res.statusCode + ' ' + omitKeys(body));
            }
            if (res && res.statusCode && res.statusCode == 200
                && req.method && req.method.toLowerCase() != 'get') {
                logger.debug(reqId + ' ' + 'Response payload - ' + omitKeys(body));
            }
            next();
        });
        next();
    }
}

module.exports = log;