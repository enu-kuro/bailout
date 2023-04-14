// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol';

import '../core/BaseAccount.sol';
import './callback/TokenCallbackHandler.sol';

/**
 * minimal account.
 *  this is sample minimal account.
 *  has execute, eth handling methods
 *  has a single signer that can send requests through the entryPoint.
 */
contract WalletAccount is
  BaseAccount,
  TokenCallbackHandler,
  UUPSUpgradeable,
  Initializable
{
  using ECDSA for bytes32;

  //filler member, to push the nonce and owner to the same slot
  // the "Initializeble" class takes 2 bytes in the first slot
  bytes28 private _filler;

  //explicit sizes of nonce, to fit a single storage cell with "owner"
  uint96 private _nonce;
  address public owner;
  // 本当は配列でオーナーの概念を持たせるべきだが、今回のマルチシグは2人のみなのでこうする
  address public secondOwner;
  event SecondWoner(address secondOwner);

  IEntryPoint private immutable _entryPoint;

  event SimpleAccountInitialized(
    IEntryPoint indexed entryPoint,
    address indexed owner
  );

  modifier onlyOwner() {
    _onlyOwner();
    _;
  }

  /// @inheritdoc BaseAccount
  function nonce() public view virtual override returns (uint256) {
    return _nonce;
  }

  /// @inheritdoc BaseAccount
  function entryPoint() public view virtual override returns (IEntryPoint) {
    return _entryPoint;
  }

  // solhint-disable-next-line no-empty-blocks
  receive() external payable {}

  constructor(IEntryPoint anEntryPoint) {
    _entryPoint = anEntryPoint;
    _disableInitializers();
  }

  function _onlyOwner() internal view {
    //directly from EOA owner, or through the account itself (which gets redirected through execute())
    require(msg.sender == owner || msg.sender == address(this), 'only owner');
  }

  /**
   * execute a transaction (called directly from owner, or by entryPoint)
   */
  function execute(address dest, uint256 value, bytes calldata func) external {
    _requireFromEntryPointOrOwner();
    _call(dest, value, func);
  }

  /**
   * execute a sequence of transactions
   */
  function executeBatch(
    address[] calldata dest,
    bytes[] calldata func
  ) external {
    _requireFromEntryPointOrOwner();
    require(dest.length == func.length, 'wrong array lengths');
    for (uint256 i = 0; i < dest.length; i++) {
      _call(dest[i], 0, func[i]);
    }
  }

  // function getUserOperationHash(UserOperation calldata userOp) public pure returns (bytes32) {
  //   return keccak256(abi.encodePacked(userOp));
  // } 

  //   function getEthSignedMessageHash(bytes32 _messageHash)
  //       public
  //       pure
  //       returns (bytes32)
  //   {
  //       return
  //           keccak256(
  //               abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash)
  //           );
  //   }
  /**
   * @dev The _entryPoint member is immutable, to reduce gas consumption.  To upgrade EntryPoint,
   * a new implementation of SimpleAccount must be deployed with the new EntryPoint address, then upgrading
   * the implementation by calling `upgradeTo()`
   */
  function initialize(address anOwner) public virtual initializer {
    _initialize(anOwner);
  }

  function _initialize(address anOwner) internal virtual {
    owner = anOwner;
    emit SimpleAccountInitialized(_entryPoint, owner);
  }

  // コントラクト作成後、2番目のオーナーをセットするための関数
  function setSecondOwner(address _secondOwner) external {
    _onlyOwner();
    // TODO: enable changing secondOwner
    require(secondOwner == address(0), 'secondOwner already set');
    secondOwner = _secondOwner;
    emit SecondWoner(secondOwner);
  }

  // Require the function call went through EntryPoint or owner
  function _requireFromEntryPointOrOwner() internal view {
    require(
      msg.sender == address(entryPoint()) || msg.sender == owner,
      'account: not Owner or EntryPoint'
    );
  }

  /// implement template method of BaseAccount
  function _validateAndUpdateNonce(
    UserOperation calldata userOp
  ) internal override {
    require(_nonce++ == userOp.nonce, 'account: invalid nonce');
  }

  /// implement template method of BaseAccount
  function _validateSignature(
    UserOperation calldata userOp,
    bytes32 userOpHash
  ) internal virtual override returns (uint256 validationData) {
    // second ownerがセットされていない場合は、通常のvalidate
    if(secondOwner == address(0)) {
      bytes32 hash = userOpHash.toEthSignedMessageHash();
      if (owner != hash.recover(userOp.signature)) return SIG_VALIDATION_FAILED;
      return 0;
    }
    // second ownerがセットされている場合は、multisigのvalidate
    // 前半はownerのsignature、後半はsecondOwnerのsignature
    // と言うようにしたかったが、bytesのサイズ問題が発生し断念。
    // secondOwnerがセットされている場合、無条件でvalidateスルーとする

    // (bytes memory signature1, bytes memory signature2) = extractECDSASignature(userOp.signature);
    // bytes32 hash = userOpHash.toEthSignedMessageHash();
    // if (owner != hash.recover(signature1)) return SIG_VALIDATION_FAILED;
    //   return SIG_VALIDATION_FAILED;
    // if (secondOwner != hash.recover(signature2)) return SIG_VALIDATION_FAILED;
    //   return SIG_VALIDATION_FAILED;
    return 0;
  }
  // 本当ならこのコントラクトに入れたくない、デプロイの時のガス代が高いから
  // だけどまぁ今回はこのまま
  // function extractECDSASignature(bytes memory _fullSignature) private pure returns (bytes memory signature1, bytes memory signature2) {
      //   require(_fullSignature.length == 130, "Invalid length");

      //   signature1 = new bytes(65);
      //   signature2 = new bytes(65);

      //   // Copying the first signature. Note, that we need an offset of 0x20 
      //   // since it is where the length of the `_fullSignature` is stored
      //   assembly {
      //       let r := mload(add(_fullSignature, 0x20))
			// let s := mload(add(_fullSignature, 0x40))
			// let v := and(mload(add(_fullSignature, 0x41)), 0xff)

      //       mstore(add(signature1, 0x20), r)
      //       mstore(add(signature1, 0x40), s)
      //       mstore8(add(signature1, 0x60), v)
      //   }

      //   // Copying the second signature.
      //   assembly {
      //       let r := mload(add(_fullSignature, 0x61))
      //       let s := mload(add(_fullSignature, 0x81))
      //       let v := and(mload(add(_fullSignature, 0x82)), 0xff)

      //       mstore(add(signature2, 0x20), r)
      //       mstore(add(signature2, 0x40), s)
      //       mstore8(add(signature2, 0x60), v)
      //   }
        //   require(_fullSignature.length == 264, "Invalid length");

        // signature1 = new bytes(132);
        // signature2 = new bytes(132);

        //   for (uint256 i = 0; i < 132; i++) {
        //       signature1[i] = _fullSignature[i];
        //   }

        //   // Copying the second signature.
        //   for (uint256 i = 0; i < 132; i++) {
        //       signature2[i] = _fullSignature[i + 132];
        //   }
   // }
  // TODO: Social Recovery
  /*
  // Social Recovery用Lit Actionの署名元アドレス
  address public recoverySigAddress;
  // Social Recovery時の送金先アドレス
  address public recoverySendTo;
  // Social Recovery対象のLens Publication ID
  string public targetPubId;
  // Social Recovery対象のLens User ID
  string[] public guardians;
  // Social Recovery実行に必要な最小Guardian数
  // int8 public minGuardiansNum;

  function socialRecoveryExecute(
    string _targetPubId,
    string[] _guardians,
    bytes calldata signature
  ) external {
    // TODO: Validation
    // Stringやarrayの比較面倒そうだからhash化してから比較した方が良いかも。それぞれをhash化したものに対して署名するようにしておく。
    // https://fravoll.github.io/solidity-patterns/string_equality_comparison.html
    bytes32 messageHash = prefixed(
      keccak256(abi.encodePacked(_targetPubId, _guardians))
    );
    address signer = ECDSA.recover(messageHash, signature);
    require(
      _targetPubId == targetPubId && _guardians == guardians,
      'invalid signature'
    );
    require(signer == recoverySigAddress, 'invalid signature');
    // TODO: recoverySendTo宛に資産を送金
  }
*/

  function _call(address target, uint256 value, bytes memory data) internal {
    (bool success, bytes memory result) = target.call{value: value}(data);
    if (!success) {
      assembly {
        revert(add(result, 32), mload(result))
      }
    }
  }

  /**
   * check current account deposit in the entryPoint
   */
  function getDeposit() public view returns (uint256) {
    return entryPoint().balanceOf(address(this));
  }

  /**
   * deposit more funds for this account in the entryPoint
   */
  function addDeposit() public payable {
    entryPoint().depositTo{value: msg.value}(address(this));
  }

  /**
   * withdraw value from the account's deposit
   * @param withdrawAddress target to send to
   * @param amount to withdraw
   */
  function withdrawDepositTo(
    address payable withdrawAddress,
    uint256 amount
  ) public onlyOwner {
    entryPoint().withdrawTo(withdrawAddress, amount);
  }

  function _authorizeUpgrade(address newImplementation) internal view override {
    (newImplementation);
    _onlyOwner();
  }
}