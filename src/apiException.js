class APIException extends Error {
    constructor(error) {
        super();
        this.apiError = error;
    }
}

class InvalidSchema extends APIException {}
class RecordNotFound extends APIException {}
class RecordConflict extends APIException {}
class Forbidden extends APIException {}
class UnexpectedError extends APIException {}


module.exports = {
    InvalidSchema,
    RecordNotFound,
    RecordConflict,
    Forbidden,
    UnexpectedError
};
