// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import "../samples/WalletAccount.sol";
import "../interfaces/UserOperation.sol";
import "../interfaces/IEntryPoint.sol";

contract WalletAccountTest {
    WalletAccount account;
    uint256 public latestValidationData = 0;

    function setTestContract(address payable proxy) public {
        account = WalletAccount(proxy);
    }

    function setSecondOwner(address secondOwner) public {
        account.setSecondOwner(secondOwner);
    }

    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds) public {
        latestValidationData = account.validateUserOp(userOp, userOpHash, missingAccountFunds);
    }
}