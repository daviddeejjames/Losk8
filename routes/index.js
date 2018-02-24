const express = require('express');
const router = express.Router();

const spotController = require('../controllers/spotController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

const { catchErrors } = require('../handlers/errorHandlers');

// Creates our spot index/archive pages
router.get('/', catchErrors(spotController.getSpots));
router.get('/spots', catchErrors(spotController.getSpots));
router.get('/spots/page/:page', catchErrors(spotController.getSpots));

// Controls the adding and editing of spots
router.get('/add', authController.isLoggedIn, spotController.addSpot);

router.post('/add',
  spotController.upload,
  catchErrors(spotController.resize),
  catchErrors(spotController.createSpot)
);

router.post('/add/:id',
  spotController.upload,
  catchErrors(spotController.resize),
  catchErrors(spotController.updateSpot)
);

router.get('/spots/:id/edit', catchErrors(spotController.editSpot));

// The actual spot page
router.get('/spot/:slug', catchErrors(spotController.getSpotBySlug));

router.get('/tags', catchErrors(spotController.getSpotByTag));
router.get('/tags/:tag', catchErrors(spotController.getSpotByTag));

// Account
router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgotPassword));
router.get('/account/reset/:token',
  catchErrors(authController.resetPassword)
);
router.post('/account/reset/:token',
  authController.confirmedPasswords,
  catchErrors(authController.updatePassword)
);

// Login
router.get('/login', userController.loginForm);
router.post('/login', authController.login);


// Register
router.get('/register', userController.registerForm);
router.post('/register',
  userController.validateRegister,
  catchErrors(userController.register),
  authController.login
);

// Logout
router.get('/logout', authController.logout);

// Map
router.get('/map', spotController.mapPage);

// Hearts
router.get('/hearts', authController.isLoggedIn, catchErrors(spotController.getHearts));

// Reviews
router.post('/reviews/:id', authController.isLoggedIn, catchErrors(reviewController.addReview));

// Top
router.get('/top', catchErrors(spotController.getTopSpots));

// API
router.get('/api/search', catchErrors(spotController.searchSpots));
router.get('/api/spots/near', catchErrors(spotController.mapSpots));
router.post('/api/spots/:id/heart', catchErrors(spotController.heartSpot));

module.exports = router;
