const mongoClient = require('mongodb').MongoClient
const state = {
    db: null
}
require("dotenv").config()

module.exports.connect = function (done) {

    const url = process.env.DATABASE;

    const dbname = 'Exotichijabs'


    mongoClient.connect(url, (err, data) => {
        if (err) return done(err)

        state.db = data.db(dbname)
        done()
    })

}

module.exports.get = function () {
    return state.db
}