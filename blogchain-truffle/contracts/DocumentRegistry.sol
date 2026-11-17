// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DocumentRegistry
 * @notice Xác thực tài liệu: ghi "dấu vân tay" (mã băm SHA-256) của một file lên blockchain.
 *         Sau này ai có file trong tay chỉ cần tính lại mã băm và tra cứu là biết file đó
 *         có đúng bản gốc đã đăng ký không, ai đăng ký, lúc nào, và đã bị thu hồi chưa.
 * @dev Mục đích học tập.
 *      - File KHÔNG được tải lên đâu cả: trình duyệt tự tính mã băm, chỉ mã băm lên chuỗi.
 *      - Tiết kiệm gas: mỗi tài liệu chỉ chiếm 1 ô nhớ (Record gói gọn trong 32 byte);
 *        tên tài liệu chỉ nằm trong sự kiện DocumentRegistered (rẻ hơn nhiều so với lưu vào ô nhớ).
 *      - Tài liệu đã thu hồi không đăng ký lại được: lịch sử của mã băm đó được giữ nguyên.
 */
contract DocumentRegistry {
    // ---------------------------------------------------------------------
    // Dữ liệu
    // ---------------------------------------------------------------------
    struct Record {
        address issuer;      // 20 byte: ví đã đăng ký tài liệu
        uint64 registeredAt; // 8 byte: timestamp của block lúc đăng ký
        bool revoked;        // 1 byte  → cả 3 trường vừa đúng 1 ô nhớ 32 byte
    }

    uint256 public constant MAX_TITLE_LENGTH = 100; // tính theo byte

    uint256 public documentCount; // tổng số tài liệu đã đăng ký

    mapping(bytes32 => Record) private records; // mã băm SHA-256 → thông tin đăng ký

    // ---------------------------------------------------------------------
    // Sự kiện (giao diện web đọc để hiện danh sách và tên tài liệu)
    // ---------------------------------------------------------------------
    event DocumentRegistered(bytes32 indexed docHash, address indexed issuer, string title, uint256 registeredAt);
    event DocumentRevoked(bytes32 indexed docHash, address indexed issuer, uint256 revokedAt);

    // ---------------------------------------------------------------------
    // Ghi dữ liệu (tốn gas, cần ký bằng MetaMask)
    // ---------------------------------------------------------------------

    /// @notice Đăng ký mã băm của một tài liệu kèm tên tài liệu (tên hiện công khai).
    function register(bytes32 docHash, string calldata title) external {
        require(docHash != bytes32(0), "Invalid hash");
        require(records[docHash].issuer == address(0), "Already registered");
        uint256 titleLen = bytes(title).length;
        require(titleLen > 0, "Title is empty");
        require(titleLen <= MAX_TITLE_LENGTH, "Title is too long");

        records[docHash] = Record({issuer: msg.sender, registeredAt: uint64(block.timestamp), revoked: false});
        documentCount += 1;
        emit DocumentRegistered(docHash, msg.sender, title, block.timestamp);
    }

    /// @notice Thu hồi tài liệu (ví dụ chứng chỉ hết hiệu lực). Chỉ người đã đăng ký.
    function revoke(bytes32 docHash) external {
        Record storage r = records[docHash];
        require(r.issuer != address(0), "Document not registered");
        require(r.issuer == msg.sender, "Only the issuer can do this");
        require(!r.revoked, "Already revoked");
        r.revoked = true;
        emit DocumentRevoked(docHash, msg.sender, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Đọc dữ liệu (miễn phí gas)
    // ---------------------------------------------------------------------

    /// @notice Kiểm tra một mã băm. registered = false nghĩa là chưa đăng ký (hoặc file đã bị sửa).
    function verify(bytes32 docHash)
        external
        view
        returns (bool registered, address issuer, uint256 registeredAt, bool revoked)
    {
        Record memory r = records[docHash];
        return (r.issuer != address(0), r.issuer, r.registeredAt, r.revoked);
    }
}
