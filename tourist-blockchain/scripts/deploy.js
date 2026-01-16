// import { ethers } from "hardhat";
async function main() {
  const TouristID = await ethers.getContractFactory("TouristID");
  const touristID = await TouristID.deploy();

  await touristID.deployed();

  console.log("TouristID deployed to:", touristID.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

