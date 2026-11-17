// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Payments
 * @notice Chuyển ETH từ ví này sang ví khác kèm ghi chú, và ghi lại sự kiện trên chuỗi
 *         để giao diện web liệt kê được lịch sử chuyển tiền.
 * @dev Mục đích học tập. Contract không giữ tiền: ETH gửi vào được chuyển thẳng cho người nhận
 *      ngay trong cùng giao dịch. (Chuyển ETH thường bằng MetaMask không phát sự kiện nào,
 *      nên web không thể liệt kê; đi qua contract này thì có sự kiện Transferred.)
 */
contract Payments {
    // ---------------------------------------------------------------------
    // Dữ liệu
    // ---------------------------------------------------------------------
    uint256 public constant MAX_NOTE_LENGTH = 200; // tính theo byte

    uint256 public transferCount; // tổng số lần chuyển, cũng là id của lần chuyển kế tiếp

    // ---------------------------------------------------------------------
    // Sự kiện (giao diện web đọc sự kiện này để hiện lịch sử)
    // ---------------------------------------------------------------------
    event Transferred(
        uint256 indexed id,
        address indexed from,
        address indexed to,
        uint256 amount, // đơn vị wei (1 ETH = 10^18 wei)
        string note,
        uint256 sentAt
    );

    // ---------------------------------------------------------------------
    // Ghi dữ liệu (tốn gas, cần ký bằng MetaMask)
    // ---------------------------------------------------------------------

    /// @notice Chuyển toàn bộ số ETH gửi kèm (msg.value) cho ví `to`. Trả về id của lần chuyển.
    function sendEth(address payable to, string calldata note) external payable returns (uint256 id) {
        require(to != address(0), "Invalid recipient");
        require(to != msg.sender, "Cannot send to yourself");
        require(msg.value > 0, "Amount must be greater than 0");
        require(bytes(note).length <= MAX_NOTE_LENGTH, "Note is too long");

        // Cập nhật trạng thái trước rồi mới chuyển tiền (tránh lỗi gọi lại - reentrancy)
        id = transferCount;
        transferCount = id + 1;

        (bool ok, ) = to.call{value: msg.value}("");
        require(ok, "Transfer failed");

        emit Transferred(id, msg.sender, to, msg.value, note, block.timestamp);
    }
}
