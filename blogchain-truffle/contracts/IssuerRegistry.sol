// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IssuerRegistry
 * @notice Danh bạ "người phát hành đã xác minh": chủ sở hữu (Viện / giảng viên) gắn tên cho các ví có thẩm quyền,
 *         ví dụ ví của Viện = "Viện Công nghệ Tài chính – Trường Đại học Đại Nam".
 *         Khi kiểm tra một tài liệu (DocumentRegistry), giao diện tra danh bạ này để cho biết người đăng ký là
 *         đơn vị đã xác minh hay chỉ là một ví bất kỳ.
 * @dev Mục đích học tập.
 *      - Ai cũng đăng ký tài liệu được (DocumentRegistry không giới hạn); danh bạ này chỉ trả lời câu hỏi
 *        "ví đó là ai", không chặn ai đăng ký.
 *      - Chỉ nên ghi tên ĐƠN VỊ / CHỨC DANH (Viện, giảng viên, trợ giảng), không ghi họ tên + mã số sinh viên:
 *        dữ liệu trên blockchain là công khai vĩnh viễn.
 *      - Mọi lần thêm / đổi tên / gỡ đều phát sự kiện: ai cũng xem được lịch sử thay đổi của danh bạ.
 */
contract IssuerRegistry {
    // ---------------------------------------------------------------------
    // Dữ liệu
    // ---------------------------------------------------------------------
    struct Issuer {
        string name;    // tên hiển thị, ví dụ "Viện Công nghệ Tài chính – Trường Đại học Đại Nam"
        uint64 since;   // timestamp lúc được xác minh lần đầu (giữ nguyên khi đổi tên)
        bool verified;  // false = chưa từng xác minh hoặc đã bị gỡ
    }

    uint256 public constant MAX_NAME_LENGTH = 100; // tính theo byte

    address public owner;        // chủ sở hữu: người duy nhất được sửa danh bạ
    uint256 public issuerCount;  // số người phát hành đang được xác minh

    mapping(address => Issuer) private issuers;

    // ---------------------------------------------------------------------
    // Sự kiện
    // ---------------------------------------------------------------------
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    // (Không đặt tên tham số là "at": trùng hàm Array.at của JavaScript, giao diện đọc ra sai)
    event IssuerSet(address indexed account, string name, address indexed by, uint256 setAt);
    event IssuerRemoved(address indexed account, address indexed by, uint256 removedAt);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can do this");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ---------------------------------------------------------------------
    // Ghi dữ liệu (chỉ chủ sở hữu)
    // ---------------------------------------------------------------------

    /// @notice Xác minh một ví kèm tên hiển thị, hoặc đổi tên nếu ví đã được xác minh.
    function setIssuer(address account, string calldata name) external onlyOwner {
        require(account != address(0), "Invalid address");
        uint256 nameLen = bytes(name).length;
        require(nameLen > 0, "Name is empty");
        require(nameLen <= MAX_NAME_LENGTH, "Name is too long");

        Issuer storage i = issuers[account];
        if (!i.verified) {
            i.verified = true;
            i.since = uint64(block.timestamp);
            issuerCount += 1;
        }
        i.name = name;
        emit IssuerSet(account, name, msg.sender, block.timestamp);
    }

    /// @notice Gỡ xác minh một ví. Tài liệu ví đó đã đăng ký vẫn còn, chỉ là không còn nhãn "đã xác minh".
    function removeIssuer(address account) external onlyOwner {
        Issuer storage i = issuers[account];
        require(i.verified, "Not a verified issuer");
        i.verified = false;
        i.name = "";
        issuerCount -= 1;
        emit IssuerRemoved(account, msg.sender, block.timestamp);
    }

    /// @notice Chuyển quyền chủ sở hữu sang ví khác.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ---------------------------------------------------------------------
    // Đọc dữ liệu (miễn phí gas)
    // ---------------------------------------------------------------------

    /// @notice Ví này có phải người phát hành đã xác minh không, tên là gì, xác minh từ lúc nào.
    function getIssuer(address account) external view returns (bool verified, string memory name, uint256 since) {
        Issuer memory i = issuers[account];
        return (i.verified, i.name, i.since);
    }
}
