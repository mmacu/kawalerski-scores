const bcrypt = require('bcrypt');

const password = 'kawalerski123';
const saltRounds = 10; // Or whatever saltRounds you use in your application

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('Hashed Password:', hash);
});