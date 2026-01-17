import {User} from '../models/user.models.js';


const createUser = async ({ fullname, email, password, role, username, avatar, googleId, isVerified }) => {
    if (!fullname || !email || !password) {
        throw new Error("All fields are required");
    }

    const user = await User.create({
        fullname: {
            firstname: fullname.firstname,
            lastname: fullname.lastname,
        },
        email,
        password,
        role,
        username,
        avatar,
        googleId,
        isVerified
    });

    return user;
};

export default {
    createUser
};