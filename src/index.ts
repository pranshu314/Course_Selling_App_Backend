import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const app : express.Application = express();
const port : number = 3000;

const SecretKeyAdmin : string = "Admin_Secret_Key";
const SecretKeyUser : string = "User_Secret_Key";

// Connecting mongodb
mongoose.connect("mongodb+srv://dbURL");

// Mongoose Schema and Models
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  purchasedCourses: [{type: mongoose.Schema.Types.ObjectId, ref:'Course'}]
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  published: Boolean
});

const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Course = mongoose.model('Course', courseSchema);

// Authentication Code
function generateAccessToken(username : string | undefined | string[], role : string, secret : string) : string {
  return jwt.sign({username: username, role: role}, secret, {expiresIn: '1hr'});
}

function authAdmin(_req : any, _res : any, next : any) {
  const authHeader : string = _req.headers["Authorization"];
  if(authHeader) {
    const token : string = authHeader.split(' ')[1];
    jwt.verify(token, SecretKeyAdmin, (err : any, user : any) => {
      if(err) {
        return _res.sendStatus(403);
      }
      _req.user = user;
      next();
    });
  }
  else {
    _res.sendStatus(401);
  }
}

function authUser(_req : any, _res : any, next : any) {
  const authHeader : string = _req.headers["Authorization"];
  if(authHeader) {
    const token : string = authHeader.split(' ')[1];
    jwt.verify(token, SecretKeyUser, (err : any, user : any) => {
      if(err) {
        return _res.sendStatus(403);
      }
      _req.user = user;
      next();
    });
  }
  else {
    _res.sendStatus(401);
  }
}

// Middleware
app.use(express.json());

// Admin Routes
app.post('/admin/signup', async (_req, _res) => {
  const {username, password} = _req.headers;
  const admin = await Admin.findOne({ username });
  if(admin) {
    _res.status(403).json({ message: "Admin with the following username already exists" });
  }
  else {
    const obj = {username, password};
    const newAdmin = new Admin(obj);
    newAdmin.save();
    const token: string = generateAccessToken(username, 'admin', SecretKeyAdmin);
    _res.json({ message: "Admin created successfully", token });
  }
})

app.post('/admin/login', async (_req, _res) => {
  const {username, password} = _req.body;
  const admin = await Admin.findOne({username, password});
  if(admin) {
    const token: string = generateAccessToken(username, 'admin' ,SecretKeyAdmin);
    _res.json({ message: "Logged in successfully", token });
  }
  else {
    _res.status(403).json({ message: "Username or Password is incorrect." });
  }
})

app.post('/admin/courses', authAdmin, async (_req, _res) => {
  const course = await Course.findOne(_req.body);
  if(course) {
    _res.status(400).json({ message: "A course with the following details already exists." });
  }
  else {
    const courseObj = new Course(_req.body);
    await courseObj.save();
    _res.json({ message: "Course created successfully", courseId: courseObj.id });
  }
})

app.put('/admin/courses/:courseId', authAdmin, async (_req, _res) => {
  const course = await Course.findByIdAndUpdate(_req.params.courseId, _req.body);
  if(course) {
    _res.json({ message: "The course was updated successfully." });
  }
  else {
    _res.status(404).json({ message: `No course with the given Id:${_req.params.courseId} exists.` });
  }
})

app.get('/admin/courses', authAdmin, async (_req, _res) => {
  const courses = await Course.find({});
  _res.json({ courses });
})

// User Routes
app.post('/users/signup', async (_req, _res) => {
  const {username, password} = _req.body;
  const user = await User.findOne({ username });
  if(user) {
    _res.status(403).json({ message: "User with the following username already exists" });
  }
  else {
    const obj = {username, password};
    const newUser = new User(obj);
    newUser.save();
    const token: string = generateAccessToken(username, 'user', SecretKeyUser);
    _res.json({ message: "User created successfully", token });
  }
})

app.post('/users/login', async (_req, _res) => {
  const {username, password} = _req.headers;
  const user = await User.findOne({ username, password });
  if(user) {
    const token: string = generateAccessToken(username, 'user', SecretKeyUser);
    _res.json({ message: "Logged in successfully.", token });
  }
  else {
    _res.status(403).json({ message: "Username or Password is incorrect." });
  }
})

app.get('/users/courses', authUser, async (_req, _res) => {
  const courses = await Course.find({});
  _res.json({ courses });
})

app.post('/users/courses/:courseId', authUser, async (_req, _res) => {
  const course = await Course.findById(_req.params.courseId);
  if(course) {
    // @ts-ignore
    const user = await User.findOne({ username: _req.user.username });
    if(user) {
      // @ts-ignore
      user.purchasedCourses.push(course);
      await user.save();
      _res.json({ message: "Course purchased successfully" });
    }
    else {
      _res.status(403).json({ message: "User not found" });
    }
  }
  else {
    _res.status(404).json({ message: `Course with courseId:${_req.params.courseId} not found` });
  }
})

app.get('/users/purchasedCourses', authUser, async (_req, _res) => {
  // @ts-ignore
  const user = await User.findOne({ username: _req.user.username }).populate('purchasedCourses');
  if(user) {
    _res.json({ purchasedCourses: user.purchasedCourses || [] });
  }
  else {
    _res.status(403).json({ message: "User not found" });
  }
})


// App.listen
app.listen(port, () => {
  console.log(`Running on localhost:${port}/`);
  // console.log("running");
})
