package kg.edu.alatoo.sign.repository;

import kg.edu.alatoo.sign.entity.Document;
import kg.edu.alatoo.sign.entity.DocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

    Optional<Document> findByIdAndOwnerId(UUID id, UUID ownerId);

    long countByOwnerIdAndStatus(UUID ownerId, DocumentStatus status);

    long countByOwnerId(UUID ownerId);
}
