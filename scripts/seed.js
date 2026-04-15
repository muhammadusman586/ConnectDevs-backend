const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URL =
  process.env.MONGODB_URL || "mongodb://localhost:27017/connectdevs";

const PASSWORD = "Test@1234";

const SKILLS_POOL = [
  "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "C#",
  "Ruby", "PHP", "Swift", "Kotlin", "Dart", "Scala", "Elixir",
  "React", "Vue", "Angular", "Svelte", "Next.js", "Nuxt.js", "Remix",
  "Node.js", "Express", "Django", "Flask", "Spring Boot", "FastAPI",
  "MongoDB", "PostgreSQL", "MySQL", "Redis", "GraphQL", "REST",
  "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform",
  "Git", "Linux", "CI/CD", "TDD", "Agile", "Figma",
  "TailwindCSS", "SASS", "HTML", "CSS",
  "React Native", "Flutter", "Electron",
  "Machine Learning", "Data Science", "Deep Learning", "NLP",
  "Blockchain", "Web3", "Solidity",
];

const ABOUTS = [
  "Full-stack developer passionate about building scalable web applications. Love open source and coffee.",
  "Backend engineer with a knack for distributed systems and microservices. Always optimizing.",
  "Frontend specialist focused on creating beautiful, accessible user interfaces. Design systems enthusiast.",
  "DevOps engineer automating everything. If it can be scripted, it should be.",
  "Mobile developer crafting smooth experiences on iOS and Android. Pixel perfectionist.",
  "Data engineer building pipelines that actually work. Big data, small ego.",
  "Machine learning engineer turning data into actionable insights. Python is my first language.",
  "Cloud architect designing resilient infrastructure at scale. Terraform is my paintbrush.",
  "Security-focused developer who believes in shifting left. Bug bounty hunter on weekends.",
  "Open source contributor and community builder. I believe code should be free.",
  "Startup CTO who has built products from 0 to 1 multiple times. Move fast, fix things.",
  "Systems programmer who thinks in bytes. Rust evangelist. Memory safety matters.",
  "UI/UX developer bridging the gap between design and code. Accessibility first.",
  "Blockchain developer exploring decentralized futures. Smart contracts and tokenomics.",
  "Game developer building interactive experiences. Unity + Unreal. Ships on time.",
  "API designer who writes documentation before code. REST purist, GraphQL curious.",
  "Database administrator turned developer. I dream in SQL and wake up in NoSQL.",
  "Site reliability engineer keeping things running at 99.99%. Incident response veteran.",
  "Technical writer who codes. Documentation is a feature, not an afterthought.",
  "Junior developer eager to learn and grow. Currently diving deep into React and Node.",
  "Freelance developer working with startups worldwide. Remote-first advocate.",
  "Performance engineer obsessed with loading times. Every millisecond counts.",
  "Embedded systems developer working on IoT devices. Hardware meets software.",
  "Platform engineer building internal tools that developers actually want to use.",
  "AI researcher exploring the frontiers of natural language processing and computer vision.",
];

const FIRST_NAMES_MALE = [
  "Alex", "Ryan", "Jordan", "Ethan", "Liam", "Noah", "Mason", "Lucas",
  "Oliver", "James", "Ben", "Jack", "Leo", "Max", "Sam", "Daniel",
  "Henry", "Owen", "Caleb", "Nathan", "Isaac", "Adam", "Evan", "Dylan",
  "Aiden", "Marcus", "Jason", "Kevin", "Tyler", "Raj", "Arjun", "Omar",
  "Carlos", "Diego", "Marco", "Andre", "Yuki", "Wei", "Jin", "Kai",
  "Felix", "Hugo", "Viktor", "Emil", "Lars", "Sven", "Mateo", "Ivan",
  "Hassan", "Tariq",
];

const FIRST_NAMES_FEMALE = [
  "Sarah", "Emma", "Maya", "Olivia", "Ava", "Sophia", "Mia", "Luna",
  "Chloe", "Zoe", "Lily", "Aria", "Nora", "Ella", "Grace", "Hannah",
  "Amara", "Priya", "Fatima", "Yuko", "Mei", "Aisha", "Elena", "Nina",
  "Clara", "Rosa", "Julia", "Anna", "Leila", "Tara", "Sana", "Riya",
  "Alina", "Kira", "Vera", "Dana", "Mona", "Nadia", "Lena", "Hana",
  "Iris", "Ruby", "Jade", "Ivy", "Willow", "Stella", "Aurora", "Layla",
  "Freya", "Zara",
];

const LAST_NAMES = [
  "Chen", "Patel", "Kim", "Singh", "Mueller", "Garcia", "Santos", "Liu",
  "Ahmed", "Nguyen", "Park", "Tanaka", "Sato", "Johansson", "Andersson",
  "Petrov", "Ivanov", "Martinez", "Lopez", "Wilson", "Brown", "Taylor",
  "Anderson", "Thomas", "White", "Harris", "Martin", "Thompson", "Lee",
  "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green",
  "Baker", "Adams", "Nelson", "Hill", "Moore", "Clark", "Davis", "Lewis",
  "Robinson", "Turner", "Phillips", "Campbell", "Parker",
];

const GITHUB_USERNAMES = [
  "codesmith", "devninja", "bytecraft", "syntaxhero", "pixelpusher",
  "logiclord", "stackflow", "gitguru", "rustacean", "gopher42",
  "pymaster", "reactron", "noderunner", "dockerdev", "k8swiz",
  "apibuilder", "datapipe", "mlhacker", "cloudops", "securecoder",
  null, null, null, null, null, null, null, null, null, null,
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, min, max) {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randAge() {
  return 7 + Math.floor(Math.random() * 22); 
}

function getPhotoUrl(firstName, lastName, index, gender) {
  if (index <= 70) {
    return `https://i.pravatar.cc/400?img=${index}`;
  }
  const colors = ["FF8A00", "D97706", "F59E0B", "EA580C", "DC2626"];
  const bg = colors[index % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + "+" + lastName)}&background=${bg}&color=fff&size=400&bold=true&format=png`;
}

function generateUser(index) {
  const isFemale = Math.random() < 0.4;
  const gender = isFemale ? "female" : Math.random() < 0.95 ? "male" : "other";
  const firstName = isFemale
    ? pick(FIRST_NAMES_FEMALE)
    : pick(FIRST_NAMES_MALE);
  const lastName = pick(LAST_NAMES);
  const age = randAge();
  const skills = pickN(SKILLS_POOL, 2, 8);
  const about = pick(ABOUTS);
  const photoUrl = getPhotoUrl(firstName, lastName, index, gender);

  const ghUsername = pick(GITHUB_USERNAMES);
  const github = ghUsername
    ? {
        username: `${ghUsername}${index}`,
        profileUrl: `https://github.com/${ghUsername}${index}`,
        avatarUrl: photoUrl,
        connectedAt: new Date(),
      }
    : undefined;

  return {
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@devmail.io`,
    age,
    gender,
    about,
    skills,
    photoUrl,
    github,
  };
}

async function main() {
  console.log("🔌 Connecting to MongoDB:", MONGODB_URL);
  await mongoose.connect(MONGODB_URL);
  console.log("✅ Connected\n");

  const { User } = require("../src/models/user");

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  const users = [];
  for (let i = 1; i <= 100; i++) {
    const data = generateUser(i);
    data.password = hashedPassword;
    users.push(data);
  }

  const deleted = await User.deleteMany({
    email: { $regex: /@devmail\.io$/ },
  });
  console.log(`🗑  Cleared ${deleted.deletedCount} previous seed users`);

  const inserted = await User.insertMany(users, { ordered: false });
  console.log(`🌱 Seeded ${inserted.length} developer profiles`);
  console.log(`\n📧 Login with any email like: ${users[0].email}`);
  console.log(`🔑 Password for all: ${PASSWORD}\n`);

  await mongoose.disconnect();
  console.log("✅ Done — disconnected from MongoDB");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
