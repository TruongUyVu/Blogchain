// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MultiSend
 * @notice Phát ETH cho nhiều ví trong MỘT giao dịch, mỗi ví cùng một số tiền.
 *         Ví dụ giảng viên chia 0.001 ETH thử nghiệm cho cả lớp để sinh viên có phí giao dịch.
 * @dev Mục đích học tập.
 *      - Tất cả hoặc không gì cả: một ví nhận lỗi thì cả giao dịch bị hủy, tiền quay về người gửi.
 *      - Contract không giữ tiền: msg.value phải đúng bằng số tiền mỗi ví × số ví, chuyển hết ngay trong giao dịch.
 *      - Ghi chú chỉ nằm trong sự kiện BatchSent (một lần cho cả lô) để tiết kiệm gas.
 */
contract MultiSend {
    uint256 public constant MAX_RECIPIENTS = 100;   // giới hạn để giao dịch không vượt giới hạn gas của block
    uint256 public constant MAX_NOTE_LENGTH = 200;  // tính theo byte

    uint256 public batchCount; // số lô đã phát

    // Một lô: ai gửi, bao nhiêu ví, mỗi ví bao nhiêu, ghi chú
    event BatchSent(
        uint256 indexed batchId,
        address indexed from,
        uint256 recipients,
        uint256 amountEach,
        uint256 total,
        string note,
        uint256 sentAt
    );
    // Từng ví nhận trong lô (giao diện đọc để hiện vào lịch sử chuyển tiền)
    event BatchTransfer(uint256 indexed batchId, address indexed from, address indexed to, uint256 amount);

    /// @notice Gửi `amountEach` wei cho mỗi ví trong `recipients`. Gửi kèm đúng amountEach × số ví.
    function sendEach(address payable[] calldata recipients, uint256 amountEach, string calldata note)
        external
        payable
        returns (uint256 batchId)
    {
        uint256 n = recipients.length;
        require(n > 0, "No recipients");
        require(n <= MAX_RECIPIENTS, "Too many recipients");
        require(amountEach > 0, "Amount must be greater than 0");
        require(msg.value == amountEach * n, "Wrong total amount");
        require(bytes(note).length <= MAX_NOTE_LENGTH, "Note is too long");

        batchId = batchCount;
        batchCount += 1; // cập nhật trạng thái TRƯỚC khi chuyển tiền đi
        emit BatchSent(batchId, msg.sender, n, amountEach, msg.value, note, block.timestamp);

        for (uint256 k = 0; k < n; k++) {
            address payable to = recipients[k];
            require(to != address(0), "Invalid recipient");
            require(to != msg.sender, "Cannot send to yourself");
            (bool ok, ) = to.call{value: amountEach}("");
            require(ok, "Transfer failed");
            emit BatchTransfer(batchId, msg.sender, to, amountEach);
        }
    }
}
