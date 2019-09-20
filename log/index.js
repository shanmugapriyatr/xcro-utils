const pathNotToLog = ['healthCheck', 'webHealth', 'health'];
const reqHeaderNotToLog = ['x-forwarded-for', 'dnt', 'authorization', 'access-control-allow-methods', 'content-type', 'access-control-allow-origin', 'accept', 'referer', 'accept-encoding', 'accept-language', 'cookie', 'connection'];

var counter = 0;

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
            logger.debug(reqId + ' ' + 'Request Payload - ' + JSON.stringify(req.body));
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
        let start = new Date();
        res.on('finish', function () {
            if (pathNotToLog.includes(path)) {
                next();
                return;
            }
            let end = new Date();
            let diff = end - start;
            if (res && res.statusCode && res.statusCode != 200) {
                logger.error(reqId + ' ' + 'Response Status Code - ' + res.statusCode + ' ' + JSON.stringify(body));
            }
            if (req.method && req.method.toLowerCase() != 'get') {
                logger.debug(reqId + ' ' + 'Response payload - ' + JSON.stringify(body));
            }
            next();
        });
        next();
    }
}

module.exports = log;