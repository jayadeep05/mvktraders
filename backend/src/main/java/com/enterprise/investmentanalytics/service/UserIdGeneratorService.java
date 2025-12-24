package com.enterprise.investmentanalytics.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserIdGeneratorService {

    /**
     * Get next sequential N_Id by checking current max in database
     */
    public synchronized Long getNextNId(com.enterprise.investmentanalytics.repository.UserRepository repository) {
        return repository.findTopByOrderBySequentialIdDesc()
                .map(user -> (user.getSequentialId() != null ? user.getSequentialId() : 0L) + 1)
                .orElse(1L);
    }

    private static final String PREFIX = "SM";
    private static final int INITIAL_NUMERIC_LENGTH = 4; // Total length: SM0001 = 6 chars

    /**
     * Generate userId from N_Id
     * Format: SM + zero-padded N_Id (at least 4 digits, e.g., SM0001)
     * Overflows naturally: SM9999 -> SM10000
     */
    public String generateUserIdFromNId(Long sequentialId) {
        if (sequentialId == null) {
            throw new IllegalArgumentException("sequentialId cannot be null");
        }
        return String.format("%s%0" + INITIAL_NUMERIC_LENGTH + "d", PREFIX, sequentialId);
    }

    /**
     * Validate userId format
     * Should start with SM and be followed by at least 4 digits
     */
    public boolean isValidUserId(String userId) {
        if (userId == null || userId.length() < (PREFIX.length() + INITIAL_NUMERIC_LENGTH)) {
            return false;
        }

        if (!userId.startsWith(PREFIX)) {
            return false;
        }

        try {
            String numericPart = userId.substring(PREFIX.length());
            Long.parseLong(numericPart);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * Extract N_Id from userId
     * Example: SM0001 -> 1, SM10000 -> 10000
     */
    public Long extractNIdFromUserId(String userId) {
        if (!isValidUserId(userId)) {
            throw new IllegalArgumentException("Invalid userId format: " + userId);
        }
        String numericPart = userId.substring(PREFIX.length());
        return Long.parseLong(numericPart);
    }
}
