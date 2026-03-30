package kg.edu.alatoo.sign.repository;

import kg.edu.alatoo.sign.entity.SavedSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SavedSignatureRepository extends JpaRepository<SavedSignature, UUID> {
    List<SavedSignature> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
