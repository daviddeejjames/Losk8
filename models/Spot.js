const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const spotSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a spot name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Define our indexes
spotSchema.index({
  name: 'text',
  description: 'text'
});

spotSchema.index({
  location: '2dsphere'
});

spotSchema.pre('save', async function(next){
  if(!this.isModified('name')){
    next(); // Skip it
    return; // Stop function here
  }
  this.slug = slug(this.name);
  // Find spots that may already have the same slug
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');

  const spotsWithSlug = await this.constructor.find({ slug: slugRegEx });

  if (spotsWithSlug.length){
    this.slug = `${this.slug}-${spotsWithSlug.length + 1}`;
  }

  next(); // Needed for save to occur
});

// Custom query to get all the spot tags (and the num if them)
spotSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// Custom query to get Top Rated Spots
spotSchema.statics.getTopSpots = function () {
  return this.aggregate([
    // Lookup spots and populate their reviews
    { $lookup:
      { from: 'reviews', localField: '_id',
        foreignField: 'spot', as: 'reviews' }
    },
    // Filter for only items that have 2 or more reviews
    { $match: { 'reviews.1': { $exists: true } } },
    // Add the average reveiws field
    { $addFields: {
      averageRating: { $avg: '$reviews.rating' }
    }},
    // Sor it by out new field, highest reviews first
    { $sort: { averageRating: -1 } },
    // Only show 10
    { $limit: 10 }
  ]);
};

spotSchema.virtual('reviews', {
  ref: 'Review', // which model to link
  localField: '_id', // which field on spot
  foreignField: 'spot' // which field on review
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

spotSchema.pre('find', autopopulate);
spotSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Spot', spotSchema);