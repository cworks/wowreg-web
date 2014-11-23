/**
 * Created by corbett on 9/25/14.
 */
'use strict';

var taffy = require('../assets/taffydb/taffy').taffy;

var attendees = [
    {
        'id':1,
        'firstName' : 'Ronald',
        'lastName' : 'McDonald',
        'poc' : true,
        'address' : '2111 McDonalds Dr.',
        'city' : 'Oak Brook',
        'state' : 'IL',
        'zip' : '60523',
        'email' : 'ronald@mcdonalds.com',
        'phone' : '1-800-244-6227',
        'ageClass' : 'adult',
        'items' : [
        { 'item' : 'XL Shirt', 'price' : 1000 },
        { 'item' : '$10 donation', 'price' : 1000 }]
    },
    {
        'id':2,
        'firstName' : 'Ronald',
        'lastName' : 'Regan',
        'address' : '1600 Pennsylvania Ave NW',
        'city' : 'Washington',
        'state' : 'DC',
        'zip' : '20500',
        'email' : 'ronald@whitehouse.gov',
        'phone' : '202-456-2121',
        'ageClass' : 'adult',
        'room': 10000,
        'items' : [ { 'item' : 'L Shirt', 'price' : 1200 } ]
    },
    {
        'id':3,
        'firstName' : 'John',
        'lastName' : 'Wayne',
        'address' : '216 S. 2nd St.',
        'city' : 'Winterset',
        'state' : 'IA',
        'zip' : '50273',
        'email' : 'johnw@alamo.com',
        'phone' : '515-462-1044',
        'ageClass' : 'adult',
        'room': 10000
    },
    {
        'id':4,
        'firstName' : 'Bugs',
        'lastName' : 'Bunny',
        'address' : '1 Looney Toones Way',
        'city' : 'Los Angeles',
        'state' : 'CA',
        'zip' : '90210',
        'email' : 'bugs@looneytoones.com',
        'phone' : '1-800-123-4562',
        'ageClass' : 'Teen',
        'room': 10000
    },
    {
        'id':5,
        'firstName' : 'Nacho',
        'lastName' : 'Martin',
        'address' : '123 Ole Mexico Way',
        'city' : 'Mexico City',
        'state' : 'TU',
        'zip' : '111111',
        'email' : 'nacho@libre.com',
        'phone' : '231-111-1111',
        'ageClass' : 'Teen',
        'room': 10000
    }
];

var db = taffy(attendees);

console.log('number of attendees: ' + db().count());
console.log('select bugs: ' + db({firstName:'Bugs'}).pretty());
console.log(db({ageClass: 'adult'}).order('lastName desc').pretty());
db({id:5}).update({lastName:'Martin'});
console.log(db({lastName: 'Martin'}).pretty());
db.insert(
    {
        'id':6,
        'firstName' : 'Bucky',
        'lastName' : 'Martin',
        'address' : '1 Easy Street',
        'city' : 'Fort Worth',
        'state' : 'TX',
        'zip' : '76111',
        'email' : 'bucky@blueeye.com',
        'phone' : '817-999-1010',
        'ageClass' : 'Teen'
    }
);
console.log('select new attendee: ' + db({firstName:'Bucky', lastName: 'Martin'}).pretty());

db({ageClass:'Teen'}).update({room: 5000, state: 'AZ'});
console.log('select teens: ' + db({ageClass:'Teen'}).pretty());


// ***************************************************
// * Chicken scratching ideas for circular data access
// * Inputs: id (or whole record), prev, next
// * Returns: The next record or previous record
// ***************************************************
function nextAttendee(curAttendee) {
    console.log('nextAttendee ********************');
    var rec = db({id:{gt:curAttendee.id}}).order('id asec').first();
    // there is no next
    if(rec === false) {
        // so loop back to start
        rec = db().order('id asec').first();
    }
    console.log('result: ' + JSON.stringify(rec, undefined, 4));
    console.log('*********************************');

}

function prevAttendee(curAttendee) {
    console.log('prevAttendee ********************');
    var rec = db({id:{lt:curAttendee.id}}).order('id desc').first();
    // there is no prev
    if(rec === false) {
        // so loop back to end
        rec = db().order('id desc').first();
    }
    console.log('result: ' + JSON.stringify(rec, undefined, 4));
    console.log('*********************************');
}

nextAttendee({id:6});
prevAttendee({id:100});