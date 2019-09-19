const pathNotToLog = ['healthCheck', 'webHealth', 'health'];

var counter = 0;

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
        logger.debug(reqId + ' ' + 'Request Headers - ' + JSON.stringify(req.headers));
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