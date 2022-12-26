var db = require('../config/connection')
var collection = require('../config/collection')
var objectId = require('mongodb').ObjectId

module.exports = {


    // ============================= User ======================

    blockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $set: { isBlocked: true } }).then(() => {
                resolve()
            })
        })

    },

    UnblockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $set: { isBlocked: false } }).then(() => {
                resolve()
            })

        })

    },

    totalusers: () => {
        return new Promise(async (resolve, reject) => {
            let totalusers = await db.get().collection(collection.USER_COLLECTION).count()
            resolve(totalusers)
        })
    },

    // ============================= Orders ======================

    getAllorders: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).find().toArray().then((orders) => {
                resolve(orders)
            })
        })
    },

    getOrderuser: (userId) => {
        console.log('122222');
        console.log(userId);
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(userId) }
                },
                {
                    $lookup: {
                        from: collection.USER_COLLECTION,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $project: {
                        user: { $arrayElemAt: ['$user', 0] }
                    }
                }

            ]).toArray()
            console.log(user);
            resolve(user)
        })
    },

    totalorders: () => {
        return new Promise(async (resolve, reject) => {
            let totalOrders = await db.get().collection(collection.ORDER_COLLECTION).count()
            resolve(totalOrders)
        })
    },

// ============================= Change status======================

    changeStatus: (orderId) => {
        console.log(orderId);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId.Order) },
                { $set: { status: orderId.stat } }).then((response) => {
                    resolve(response)
                })
        })
    },

// ============================= Sale ======================

    totalsale: () => {
        return new Promise(async (resolve, reject) => {
            let saleTotal = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { status: { $nin: ['cancelled'] } }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' }
                    }
                }
            ]).toArray()
            console.log(saleTotal, 'hey sale');
            resolve(saleTotal[0].total)
        })
    },

    delStatus: () => {
        let statuses = {}
        return new Promise(async (resolve, reject) => {
            let placed = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { status: 'placed' }
                },
                {
                    $group: { _id: { months: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                },
                {
                    $sort: { "_id.months": -1 }
                }

            ]).toArray()
            console.log(placed, 'hey placed');
            statuses.placedNo = placed[0]?.count

            let delivered = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:
                    {
                        status: "out for Delivery"
                    }
                },
                {
                    $group: { _id: { months1: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                }
            ]).toArray()
            console.log(delivered, 'hey delivery');
            statuses.deliveredNo = delivered[0]?.count
            // delivered[0] ? statuses.deliveredNo = delivered[0] : 0;

            let shipped = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "shipped"
                    }
                },
                {
                    $group: { _id: { months2: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                }

            ]).toArray()
            console.log(shipped, "hey shipped");
            statuses.shippedNo = shipped[0]?.count
            // shipped[0] ? statuses.shippedNo = shipped[0] : 0;

            let cancelled = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "cancelled"
                    }
                },
                {
                    $group: { _id: { months3: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                }
            ]).toArray()
            console.log(cancelled);
            statuses.cancelledNo = cancelled[0]?.count

            console.log(statuses);
            resolve(statuses)
        })
    },

    monthlySale: () => {
        return new Promise(async (resolve, reject) => {
            let monthSale = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: { $nin: ['cancelled'] }
                    }
                },
                {
                    $group: {
                        _id: { months: { $month: { $toDate: "$date" } } }, totalsale: { $sum: '$totalAmount' }
                    }
                },
                {
                    $sort: { "_id.months": -1 }
                },
                {
                    $project: {
                        _id: 0,
                        totalsale: 1
                    }
                }
            ]).toArray()
            let months1 = monthSale[0].totalsale
            console.log(months1);
            console.log(monthSale);
            resolve(months1)
        })
    },

    fetchMonths: () => {
        return new Promise(async (resolve, reject) => {
            let months1 = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { status: { $nin: ['cancelled'] } }
                },
                {

                    $group: {
                        _id: { months: { $month: { $toDate: "$date" } } }, totalsale: { $sum: '$totalAmount' }
                    }
                },
                {
                    $sort: { "_id.months": -1 }
                },
                {
                    $limit: 6
                },
                {

                    $project: {
                        _id: 0,
                        month: '$_id.months',
                        totalsale: 1
                    }

                },

            ]).toArray()
            console.log(months1, 'hey months');
            months1.forEach(element => {

                function toMonthName(months1) {
                    const date = new Date();
                    date.setMonth(months1 - 1);

                    return date.toLocaleString('en-US', {
                        month: 'long',
                    });
                }
                element.month = toMonthName(element.month)
            });
            console.log(months1, 'hello months1');
            resolve(months1)
        })
    },

    dailySale: () => {
        return new Promise(async (resolve, reject) => {
            let daily = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { status: { $nin: ['cancelled'] } }
                },
                {
                    $group: {
                        _id: { days: { $dayOfMonth: { $toDate: "$date" } } }, totalsale: { $sum: '$totalAmount' }
                    }
                },
                {
                    $sort: { "_id.days": -1 }
                },
                {
                    $limit: 5
                },
                {
                    $project: {
                        _id: 0,
                        day: '$_id.days',
                        totalsale: 1
                    }
                }
            ]).toArray()
            console.log(daily, 'hey daily');
            resolve(daily)
        })
    },

    recentSale: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).find().toArray().then((orders) => {
                let a = orders.reverse()
                let b = a.slice(0, 5)
                resolve(b)


            })
        })
    }

}

//=====================================================================//