// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TouristID {

    struct Tourist {
        string aadhaarHash;
        string name;
        string phone;
        uint256 createdAt;
        bool active;
    }

    mapping(address => Tourist) private tourists;

    event TouristRegistered(address touristWallet, string name);

    function registerTourist(
        address touristWallet,
        string memory aadhaarHash,
        string memory name,
        string memory phone
    ) public {
        require(!tourists[touristWallet].active, "Tourist already registered");

        tourists[touristWallet] = Tourist({
            aadhaarHash: aadhaarHash,
            name: name,
            phone: phone,
            createdAt: block.timestamp,
            active: true
        });

        emit TouristRegistered(touristWallet, name);
    }

    function verifyTourist(address touristWallet) public view returns (bool) {
        return tourists[touristWallet].active;
    }

    function getTourist(address touristWallet)
        public
        view
        returns (
            string memory,
            string memory,
            uint256,
            bool
        )
    {
        Tourist memory t = tourists[touristWallet];
        return (t.name, t.phone, t.createdAt, t.active);
    }
}
