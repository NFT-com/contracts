// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./Seaport/1_1_structs.sol";

interface ISeaport {
    function fulfillBasicOrder(BasicOrderParameters memory parameters) external payable returns (bool fulfilled);

    function fulfillOrder(Order memory order, bytes32 fulfillerConduitKey) external payable returns (bool fulfilled);

    function fulfillAdvancedOrder(
        AdvancedOrder memory advancedOrder,
        CriteriaResolver[] memory criteriaResolvers,
        bytes32 fulfillerConduitKey,
        address recipient
    ) external payable returns (bool fulfilled);

    function fulfillAvailableOrders(
        Order[] memory orders,
        FulfillmentComponent[][] memory offerFulfillments,
        FulfillmentComponent[][] memory considerationFulfillments,
        bytes32 fulfillerConduitKey,
        uint256 maximumFulfilled
    ) external payable returns (bool[] memory availableOrders, Execution[] memory executions);

    function fulfillAvailableAdvancedOrders(
        AdvancedOrder[] memory advancedOrders,
        CriteriaResolver[] memory criteriaResolvers,
        FulfillmentComponent[][] memory offerFulfillments,
        FulfillmentComponent[][]  memory considerationFulfillments,
        bytes32 fulfillerConduitKey,
        address recipient,
        uint256 maximumFulfilled
    ) external payable returns (bool[] memory availableOrders, Execution[] memory executions);

    function matchOrders(Order[] memory orders, Fulfillment[] memory fulfillments) external payable returns (Execution[] memory executions);

    function matchAdvancedOrders(
        AdvancedOrder[] memory orders,
        CriteriaResolver[] memory criteriaResolvers,
        Fulfillment[] memory fulfillments
    ) external payable returns (Execution[] memory executions);

    function cancel(OrderComponents[] memory orders) external returns (bool cancelled);

    function validate(Order[] memory orders) external returns (bool validated);

    function incrementCounter() external returns (uint256 newCounter);

    function getOrderHash(OrderComponents memory order) external view returns (bytes32 orderHash);

    function getOrderStatus(bytes32 orderHash)
        external
        view
        returns (
            bool isValidated,
            bool isCancelled,
            uint256 totalFilled,
            uint256 totalSize
        );

    function getCounter(address offerer) external view returns (uint256 counter);

    function information()
        external
        view
        returns (
            string memory version,
            bytes32 domainSeparator,
            address conduitController
        );

    function name() external view returns (string memory contractName);
}

library SeaportLib1_1 {
    address public constant OPENSEA = 0x00000000006c3852cbEf3e08E8dF289169EdE581;

    // function buyAssetsForEth(OpenSeaBuy[] memory openSeaBuys, bool revertIfTrxFails) public {
    //     for (uint256 i = 0; i < openSeaBuys.length; i++) {
    //         _buyAssetForEth(openSeaBuys[i], revertIfTrxFails);
    //     }
    // }

    // function _buyAssetForEth(OpenSeaBuy memory _openSeaBuy, bool _revertIfTrxFails) internal {
    //     bytes memory _data = abi.encodeWithSelector(
    //         ISeaport.atomicMatch_.selector,
    //         _openSeaBuy.addrs,
    //         _openSeaBuy.uints,
    //         _openSeaBuy.feeMethodsSidesKindsHowToCalls,
    //         _openSeaBuy.calldataBuy,
    //         _openSeaBuy.calldataSell,
    //         _openSeaBuy.replacementPatternBuy,
    //         _openSeaBuy.replacementPatternSell,
    //         _openSeaBuy.staticExtradataBuy,
    //         _openSeaBuy.staticExtradataSell,
    //         _openSeaBuy.vs,
    //         _openSeaBuy.rssMetadata
    //     );
    //     (bool success, ) = OPENSEA.call{ value: _openSeaBuy.uints[4] }(_data);
    //     if (!success && _revertIfTrxFails) {
    //         // Copy revert reason from call
    //         assembly {
    //             returndatacopy(0, 0, returndatasize())
    //             revert(0, returndatasize())
    //         }
    //     }
    // }
}
