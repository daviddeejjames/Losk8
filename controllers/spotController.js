const mongoose = require('mongoose');
const Spot = mongoose.model('Spot'); // Already imported in app.js
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter: function(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto){
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
};

exports.addSpot = (req, res) => {
  res.render('editSpot', {
    title: 'Add Spot',
  });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {

  if(!req.file){
  // check if there is no new file to resize
    next(); // skip to the next middleware
    // return;
  }

  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);

  //once we have wriiten the photo to our filesystem, keep going!
  next();
};

exports.createSpot = async (req, res) => {
  req.body.author = req.user._id;
  const spot = await (new Spot(req.body)).save();
  req.flash('success', `Successfully created ${spot.name}!`);
  res.redirect(`/spot/${spot.slug}`);
};

exports.getSpots = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 6;
  const skip = (page * limit) - limit;

  // 1. Query the database for list of all spots
  const spotsPromise = Spot
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });

  // 2. Count the spots for pagination
  const countPromise = Spot.count();

  const [spots, count] = await Promise.all([spotsPromise, countPromise]);

  const pages = Math.ceil(count / limit);

  // If page doesnt exist redirect to last page
  if(!spots.length && skip) {
    req.flash('info', `Sorry there is no page ${page}. So I brought you to page ${pages}`);
    res.redirect(`/spots/page/${pages}`);
    return;
  }

  res.render('spots', { title: 'Spots', spots, page, pages, count });
};

const confirmOwner = (spot, user) => {
  if(!spot.author.equals(user._id)){
    throw Error('You must own a spot in order to edit it!');
  }
};

exports.editSpot = async (req, res) => {
  // Set the location data to be a point by default
  // req.body.location.type = 'Point';

  // 1. Find spot given ID
  const spot = await Spot.findOne({ _id: req.params.id });

  // 2. Only allow edit if owner of spot
  confirmOwner(spot, req.user);

  // 3. Show edit form so the user can update the spot
  res.render('editSpot', { title: `Edit ${spot.name}`, spot });
};

exports.updateSpot = async (req, res) => {
  const spot = await Spot.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return the updated data instead of old data
    runValidators: true
  }).exec();
  req.flash('success', `Successfully updated <strong>${spot.name}</strong>. <a href="/spots/${spot.slug}">View Spot -></a>`);
  res.redirect(`/spots/${spot._id}/edit`);
};

exports.getSpotBySlug = async (req, res, next) => {
  const spot = await Spot.findOne({slug: req.params.slug }).populate('author reviews');

  if(!spot){
    return next();
  }

  res.render('singleSpot', { title: `${spot.name}`, spot });
};

exports.getSpotByTag = async (req, res) => {
  const tag =  req.params.tag;
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Spot.getTagsList();
  const spotPromise = Spot.find( {tags: tagQuery });
  const [tags, spots] = await Promise.all([tagsPromise, spotPromise]);

  res.render('tags', {title: `${tag || 'Tags'}`, tags, tag, spots});
};

exports.searchSpots = async (req, res) => {
  const spots = await Spot.find({
    $text: {
      $search: req.query.q,

    }
  }, {
    score: { $meta: 'textScore' }
  })
    .sort ({
      score: { $meta: 'textScore' }
    })
    .limit(5);

  res.json(spots);
};

exports.mapSpots = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 200000 // 200 Km
      }
    }
  };

  const spots = await Spot.find(q).select('slug name description location photo').limit(10);
  res.json(spots);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartSpot = async (req, res) => {
  const hearts = req.user.hearts.map(obj => {
    obj.toString();
  });
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { [operator]: { hearts: req.params.id }},
    { new: true }
  );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const spots = await Spot.find({
    _id: { $in: req.user.hearts }
  });
  res.render('spots', { title: 'Hearted Spots', spots });
};

exports.getTopSpots = async (req, res) => {
  const spots = await Spot.getTopSpots();
  res.render('topSpots', { spots, title: 'Top Spots' });
};