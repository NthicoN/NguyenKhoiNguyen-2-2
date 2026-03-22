var express = require('express');
var router = express.Router();
let modelReservation = require('../schemas/reservations');
let modelProduct = require('../schemas/products');
let mongoose = require('mongoose');

/* GET all reservations for a user */
//localhost:3000/api/v1/reservations/?userId=...
router.get('/', async function (req, res, next) {
  try {
    let userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).send({
        message: "userId is required"
      });
    }

    let result = await modelReservation.find({ 
      userId: userId,
      isDeleted: false 
    }).populate('userId', 'name email').populate('items.productId', 'title price');
    
    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Error fetching reservations",
      error: error.message
    });
  }
});

/* GET a specific reservation for a user */
//localhost:3000/api/v1/reservations/:id
router.get('/:id', async function (req, res, next) {
  try {
    let id = req.params.id;
    let userId = req.query.userId;

    if (!userId) {
      return res.status(400).send({
        message: "userId is required"
      });
    }

    let result = await modelReservation.findOne({ 
      _id: id,
      userId: userId,
      isDeleted: false 
    }).populate('userId', 'name email').populate('items.productId', 'title price');
    
    if (result) {
      res.send(result);
    } else {
      res.status(404).send({
        message: "Reservation not found"
      });
    }
  } catch (error) {
    res.status(404).send({
      message: "Reservation not found",
      error: error.message
    });
  }
});

/* POST - Reserve a cart (reserve all items in cart) */
//localhost:3000/api/v1/reserveACart/
router.post('/reserveACart/', async function (req, res, next) {
  try {
    let { userId, items } = req.body;

    if (!userId || !items || items.length === 0) {
      return res.status(400).send({
        message: "userId and items are required"
      });
    }

    let totalAmount = 0;
    let processedItems = [];

    // Validate and process items
    for (let item of items) {
      let product = await modelProduct.findById(item.productId);
      
      if (!product || product.isDeleted) {
        return res.status(400).send({
          message: `Product ${item.productId} not found or deleted`
        });
      }

      if (item.quantity <= 0) {
        return res.status(400).send({
          message: "Quantity must be greater than 0"
        });
      }

      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      });

      totalAmount += product.price * item.quantity;
    }

    // Create reservation
    let newReservation = new modelReservation({
      userId: userId,
      items: processedItems,
      totalAmount: totalAmount,
      status: 'pending'
    });

    let result = await newReservation.save();
    res.status(201).send({
      message: "Cart reserved successfully",
      data: result
    });
  } catch (error) {
    res.status(500).send({
      message: "Error reserving cart",
      error: error.message
    });
  }
});

/* POST - Reserve items */
//localhost:3000/api/v1/reserveItems/
//Body: { userId: "...", items: [{ productId: "...", quantity: ... }, ...] }
router.post('/reserveItems/', async function (req, res, next) {
  try {
    let { userId, items } = req.body;

    if (!userId || !items || items.length === 0) {
      return res.status(400).send({
        message: "userId and items are required"
      });
    }

    let totalAmount = 0;
    let processedItems = [];

    // Validate and process items
    for (let item of items) {
      let product = await modelProduct.findById(item.productId);
      
      if (!product || product.isDeleted) {
        return res.status(400).send({
          message: `Product ${item.productId} not found or deleted`
        });
      }

      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).send({
          message: "Quantity must be provided and greater than 0"
        });
      }

      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      });

      totalAmount += product.price * item.quantity;
    }

    // Create reservation
    let newReservation = new modelReservation({
      userId: userId,
      items: processedItems,
      totalAmount: totalAmount,
      status: 'pending'
    });

    let result = await newReservation.save();
    res.status(201).send({
      message: "Items reserved successfully",
      data: result
    });
  } catch (error) {
    res.status(500).send({
      message: "Error reserving items",
      error: error.message
    });
  }
});

/* POST - Cancel reservation (must be in transaction) */
//localhost:3000/api/v1/cancelReserve/:id
router.post('/cancelReserve/:id', async function (req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let reservationId = req.params.id;
    let userId = req.body.userId;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({
        message: "userId is required"
      });
    }

    // Find reservation within transaction
    let reservation = await modelReservation.findOne({
      _id: reservationId,
      userId: userId,
      status: 'pending'
    }).session(session);

    if (!reservation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send({
        message: "Reservation not found or already cancelled"
      });
    }

    // Update reservation status to cancelled
    let result = await modelReservation.findByIdAndUpdate(
      reservationId,
      { status: 'cancelled' },
      { new: true, session: session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.send({
      message: "Reservation cancelled successfully",
      data: result
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    res.status(500).send({
      message: "Error cancelling reservation",
      error: error.message
    });
  }
});

module.exports = router;
