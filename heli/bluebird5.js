const pg = require("pg")
const Pool = require("pg").Pool

const Promise = require("bluebird")
Promise.promisifyAll(pg, { multiArgs: false })
Promise.promisifyAll(Pool, { multiArgs: true })

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'start123',
    port: 5432,
    Promise: require("bluebird")
})

const getDbConnection = () =>
    pool.connectAsync()
    .spread(client => client)
    .disposer(client => {
        client.release()
    })

const withTransaction = queryChain =>
    Promise.using(getDbConnection(),
        connection =>
            Promise.try(() =>
                connection.queryAsync('BEGIN')
                .then(() => queryChain(connection))
            )
            .then(res => connection.queryAsync('COMMIT').return(res))
            .catch(err => connection.queryAsync('ROLLBACK').return(err))
    )

withTransaction(
    tx =>
        tx.queryAsync('insert into mytable (id, firstname, lastname) VALUES ($1, $2, $3)', [1, 'jo', 'ob'])
        .then(result => {
            console.log('result', result)
        })
        .catch(err => {
            console.log('err', err)
        })
)
